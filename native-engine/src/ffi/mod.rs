use std::ffi::c_void;

use std::sync::{Mutex, OnceLock};

use crate::navigation::bearing::{distance_meters, initial_bearing_degrees};
use crate::navigation::graph::CampusGraph;
use crate::navigation::pathfinding::{find_path, PathResult};
use crate::sensors::barometer::{FloorDetector, FloorProfile};
use crate::sensors::ekf::{
    ekf_predict, ekf_update_floor, ekf_update_gps, ekf_update_heading,
    ekf_update_magnetic_position, ekf_update_wifi_position, init_ekf, EkfState,
};
use crate::sensors::heading::{heading_confidence_from_accuracy, smooth_heading_degrees};
use crate::sensors::magnetic::{
    magnetic_magnitude, MagneticFingerprint, MagneticFingerprintDb, MagneticMatchResult,
};
use crate::sensors::motion::{
    acceleration_delta_from_gravity, classify_motion_state, gyro_magnitude,
};
use crate::sensors::pdr::{dead_reckon_delta, estimate_step_length_meters};
use crate::sensors::position::{
    estimated_position, init_from_gps, update_gps, update_pdr, PositionState,
};
use crate::sensors::sampling::SamplingController;
use crate::sensors::wifi_rssi::{ApReading, WifiFingerprint, WifiFingerprintDb, WifiMatchResult};
use crate::utils::math::{arrival_reached, proximity_scale, signed_delta_degrees};
use crate::ENGINE_VERSION_CODE;

type JNIEnv = *mut c_void;
type JObject = *mut c_void;
type JBoolean = u8;
type JByte = i8;
type JDouble = f64;
type JInt = i32;
type JLong = i64;

const MAX_AP_READINGS_FROM_JNI: usize = 4_096;

static POSITION_STATE: Mutex<Option<PositionState>> = Mutex::new(None);
static EKF_STATE: Mutex<Option<EkfState>> = Mutex::new(None);
static GRAPH: OnceLock<Mutex<CampusGraph>> = OnceLock::new();
static LAST_PATH: OnceLock<Mutex<PathResult>> = OnceLock::new();
static WIFI_DB: OnceLock<Mutex<WifiFingerprintDb>> = OnceLock::new();
static LAST_WIFI_MATCH: OnceLock<Mutex<Option<WifiMatchResult>>> = OnceLock::new();
static MAGNETIC_DB: OnceLock<Mutex<MagneticFingerprintDb>> = OnceLock::new();
static LAST_MAGNETIC_MATCH: OnceLock<Mutex<Option<MagneticMatchResult>>> = OnceLock::new();
static FLOOR_DETECTOR: OnceLock<Mutex<FloorDetector>> = OnceLock::new();
static SAMPLING_CONTROLLER: OnceLock<Mutex<SamplingController>> = OnceLock::new();

fn graph() -> &'static Mutex<CampusGraph> {
    GRAPH.get_or_init(|| Mutex::new(CampusGraph::new()))
}

fn last_path() -> &'static Mutex<PathResult> {
    LAST_PATH.get_or_init(|| Mutex::new(PathResult::not_found()))
}

fn wifi_db() -> &'static Mutex<WifiFingerprintDb> {
    WIFI_DB.get_or_init(|| Mutex::new(WifiFingerprintDb::new()))
}

fn last_wifi_match() -> &'static Mutex<Option<WifiMatchResult>> {
    LAST_WIFI_MATCH.get_or_init(|| Mutex::new(None))
}

fn magnetic_db() -> &'static Mutex<MagneticFingerprintDb> {
    MAGNETIC_DB.get_or_init(|| Mutex::new(MagneticFingerprintDb::new()))
}

fn last_magnetic_match() -> &'static Mutex<Option<MagneticMatchResult>> {
    LAST_MAGNETIC_MATCH.get_or_init(|| Mutex::new(None))
}

fn floor_detector() -> &'static Mutex<FloorDetector> {
    FLOOR_DETECTOR.get_or_init(|| Mutex::new(FloorDetector::new()))
}

fn sampling_controller() -> &'static Mutex<SamplingController> {
    SAMPLING_CONTROLLER.get_or_init(|| Mutex::new(SamplingController::new()))
}

fn ap_readings_from_raw(
    bssid_hashes_ptr: JLong,
    rssi_ptr: JLong,
    count: JInt,
) -> Option<Vec<ApReading>> {
    if bssid_hashes_ptr == 0 || rssi_ptr == 0 || count <= 0 {
        return None;
    }

    let count = count as usize;
    if count > MAX_AP_READINGS_FROM_JNI {
        return None;
    }

    let bssid_hashes = bssid_hashes_ptr as *const u64;
    let rssi_values = rssi_ptr as *const i8;
    let mut readings = Vec::with_capacity(count);
    for index in 0..count {
        readings.push(ApReading {
            bssid_hash: unsafe { bssid_hashes.add(index).read_unaligned() },
            rssi_dbm: unsafe { rssi_values.add(index).read_unaligned() },
        });
    }

    Some(readings)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEngineVersionCode(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    ENGINE_VERSION_CODE
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeDistanceMeters(
    _env: JNIEnv,
    _this: JObject,
    origin_latitude: JDouble,
    origin_longitude: JDouble,
    destination_latitude: JDouble,
    destination_longitude: JDouble,
) -> JDouble {
    distance_meters(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    )
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeBearingDegrees(
    _env: JNIEnv,
    _this: JObject,
    origin_latitude: JDouble,
    origin_longitude: JDouble,
    destination_latitude: JDouble,
    destination_longitude: JDouble,
) -> JDouble {
    initial_bearing_degrees(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    )
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeHeadingDeltaDegrees(
    _env: JNIEnv,
    _this: JObject,
    current_heading_degrees: JDouble,
    target_bearing_degrees: JDouble,
) -> JDouble {
    signed_delta_degrees(current_heading_degrees, target_bearing_degrees)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeProximityScale(
    _env: JNIEnv,
    _this: JObject,
    distance_meters: JDouble,
) -> JDouble {
    proximity_scale(distance_meters)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeArrivalReached(
    _env: JNIEnv,
    _this: JObject,
    distance_meters: JDouble,
) -> JBoolean {
    if arrival_reached(distance_meters) {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSmoothHeadingDegrees(
    _env: JNIEnv,
    _this: JObject,
    previous_heading_degrees: JDouble,
    measured_heading_degrees: JDouble,
    responsiveness: JDouble,
) -> JDouble {
    smooth_heading_degrees(
        previous_heading_degrees,
        measured_heading_degrees,
        responsiveness,
    )
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeHeadingConfidence(
    _env: JNIEnv,
    _this: JObject,
    sensor_accuracy: JInt,
) -> JDouble {
    heading_confidence_from_accuracy(sensor_accuracy)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeAccelerationDeltaFromGravity(
    _env: JNIEnv,
    _this: JObject,
    x: JDouble,
    y: JDouble,
    z: JDouble,
) -> JDouble {
    acceleration_delta_from_gravity(x, y, z)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGyroMagnitude(
    _env: JNIEnv,
    _this: JObject,
    x: JDouble,
    y: JDouble,
    z: JDouble,
) -> JDouble {
    gyro_magnitude(x, y, z)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMotionState(
    _env: JNIEnv,
    _this: JObject,
    acceleration_delta_from_gravity: JDouble,
    gyro_magnitude_radians_per_second: JDouble,
) -> JInt {
    classify_motion_state(
        acceleration_delta_from_gravity,
        gyro_magnitude_radians_per_second,
    )
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEstimatedStepLengthMeters(
    _env: JNIEnv,
    _this: JObject,
    user_height_meters: JDouble,
    motion_state: JInt,
) -> JDouble {
    estimate_step_length_meters(user_height_meters, motion_state)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeDeadReckonNorthMeters(
    _env: JNIEnv,
    _this: JObject,
    heading_degrees: JDouble,
    step_length_meters: JDouble,
    step_count: JInt,
) -> JDouble {
    let step_count = step_count.max(0) as u32;
    dead_reckon_delta(heading_degrees, step_length_meters, step_count).0
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeDeadReckonEastMeters(
    _env: JNIEnv,
    _this: JObject,
    heading_degrees: JDouble,
    step_length_meters: JDouble,
    step_count: JInt,
) -> JDouble {
    let step_count = step_count.max(0) as u32;
    dead_reckon_delta(heading_degrees, step_length_meters, step_count).1
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativePositionInit(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    heading: JDouble,
) {
    if let Ok(mut state) = POSITION_STATE.lock() {
        *state = Some(init_from_gps(lat, lon, heading));
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativePositionUpdateGps(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    accuracy: JDouble,
    epoch_millis: JLong,
) {
    if let Ok(mut state) = POSITION_STATE.lock() {
        if let Some(ref mut s) = *state {
            update_gps(s, lat, lon, accuracy, epoch_millis);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativePositionUpdatePdr(
    _env: JNIEnv,
    _this: JObject,
    heading: JDouble,
    step_length: JDouble,
    step_count: JInt,
) {
    if let Ok(mut state) = POSITION_STATE.lock() {
        if let Some(ref mut s) = *state {
            update_pdr(s, heading, step_length, step_count.max(0) as u32);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativePositionLatitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    POSITION_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| estimated_position(s).0))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativePositionLongitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    POSITION_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| estimated_position(s).1))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphClear(
    _env: JNIEnv,
    _this: JObject,
) {
    if let Ok(mut graph) = graph().lock() {
        graph.nodes.clear();
        graph.edges.clear();
    }
    if let Ok(mut path) = last_path().lock() {
        *path = PathResult::not_found();
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphAddNode(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    floor: JInt,
) -> JInt {
    if !lat.is_finite() || !lon.is_finite() {
        return -1;
    }
    graph()
        .lock()
        .map(|mut graph| graph.add_node(lat, lon, floor) as JInt)
        .unwrap_or(-1)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphAddEdge(
    _env: JNIEnv,
    _this: JObject,
    from: JInt,
    to: JInt,
    distance: JDouble,
    bidirectional: JBoolean,
    wheelchair: JBoolean,
    floor_transition: JBoolean,
) {
    if from < 0 || to < 0 || !distance.is_finite() {
        return;
    }
    if let Ok(mut graph) = graph().lock() {
        graph.add_edge(
            from as u32,
            to as u32,
            distance,
            bidirectional != 0,
            wheelchair != 0,
            floor_transition != 0,
        );
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphNodeCount(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    graph()
        .lock()
        .map(|graph| graph.node_count() as JInt)
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphEdgeCount(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    graph()
        .lock()
        .map(|graph| graph.edge_count() as JInt)
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphFindPath(
    _env: JNIEnv,
    _this: JObject,
    start: JInt,
    goal: JInt,
    wheelchair_only: JBoolean,
) -> JInt {
    if start < 0 || goal < 0 {
        if let Ok(mut path) = last_path().lock() {
            *path = PathResult::not_found();
        }
        return 0;
    }

    let result = graph()
        .lock()
        .map(|graph| find_path(&graph, start as u32, goal as u32, wheelchair_only != 0))
        .unwrap_or_else(|_| PathResult::not_found());
    let length = if result.found {
        result.node_indices.len() as JInt
    } else {
        0
    };
    if let Ok(mut path) = last_path().lock() {
        *path = result;
    }
    length
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphPathNodeAt(
    _env: JNIEnv,
    _this: JObject,
    index: JInt,
) -> JInt {
    if index < 0 {
        return -1;
    }
    last_path()
        .lock()
        .ok()
        .and_then(|path| path.node_indices.get(index as usize).copied())
        .map(|node| node as JInt)
        .unwrap_or(-1)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeGraphPathDistance(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_path()
        .lock()
        .ok()
        .and_then(|path| {
            if path.found {
                Some(path.total_distance_meters)
            } else {
                None
            }
        })
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfInit(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    heading: JDouble,
    floor: JInt,
) {
    if let Some(state) = init_ekf(lat, lon, heading, floor) {
        if let Ok(mut ekf_state) = EKF_STATE.lock() {
            *ekf_state = Some(state);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfPredict(
    _env: JNIEnv,
    _this: JObject,
    heading_deg: JDouble,
    step_length_m: JDouble,
    dt_seconds: JDouble,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_predict(state, heading_deg, step_length_m, dt_seconds);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfUpdateGps(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    accuracy_m: JDouble,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_update_gps(state, lat, lon, accuracy_m);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfUpdateHeading(
    _env: JNIEnv,
    _this: JObject,
    heading_deg: JDouble,
    confidence: JDouble,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_update_heading(state, heading_deg, confidence);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfUpdateWifiPosition(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    confidence: JDouble,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_update_wifi_position(state, lat, lon, confidence);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfUpdateMagneticPosition(
    _env: JNIEnv,
    _this: JObject,
    lat: JDouble,
    lon: JDouble,
    confidence: JDouble,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_update_magnetic_position(state, lat, lon, confidence);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfUpdateFloor(
    _env: JNIEnv,
    _this: JObject,
    floor_index: JInt,
) {
    if let Ok(mut ekf_state) = EKF_STATE.lock() {
        if let Some(ref mut state) = *ekf_state {
            ekf_update_floor(state, floor_index);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfLatitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    EKF_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| s.latitude()))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfLongitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    EKF_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| s.longitude()))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfHeading(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    EKF_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| s.heading_degrees()))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfFloor(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    EKF_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| s.floor_index()))
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeEkfVelocity(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    EKF_STATE
        .lock()
        .ok()
        .and_then(|state| state.as_ref().map(|s| s.velocity_meters_per_second()))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiDbClear(
    _env: JNIEnv,
    _this: JObject,
) {
    if let Ok(mut db) = wifi_db().lock() {
        db.clear();
    }
    if let Ok(mut result) = last_wifi_match().lock() {
        *result = None;
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiDbAddFingerprint(
    _env: JNIEnv,
    _this: JObject,
    id: JInt,
    lat: JDouble,
    lon: JDouble,
    floor: JInt,
    bssid_hashes_ptr: JLong,
    rssi_ptr: JLong,
    count: JInt,
) {
    if id < 0 || !lat.is_finite() || !lon.is_finite() {
        return;
    }

    let Some(readings) = ap_readings_from_raw(bssid_hashes_ptr, rssi_ptr, count) else {
        return;
    };

    if let Ok(mut db) = wifi_db().lock() {
        db.add_fingerprint(WifiFingerprint {
            id: id as u32,
            latitude: lat,
            longitude: lon,
            floor_index: floor,
            readings,
        });
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiDbMatch(
    _env: JNIEnv,
    _this: JObject,
    bssid_hashes_ptr: JLong,
    rssi_ptr: JLong,
    count: JInt,
    k: JInt,
) -> JInt {
    let result = ap_readings_from_raw(bssid_hashes_ptr, rssi_ptr, count).and_then(|scan| {
        if k <= 0 {
            return None;
        }
        wifi_db()
            .lock()
            .ok()
            .and_then(|db| db.match_position(&scan, k as usize))
    });

    let found = result.is_some();
    if let Ok(mut last_result) = last_wifi_match().lock() {
        *last_result = result;
    }

    if found {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiMatchLatitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_wifi_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.latitude))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiMatchLongitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_wifi_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.longitude))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiMatchFloor(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    last_wifi_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.floor_index))
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeWifiMatchConfidence(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_wifi_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.confidence))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticDbClear(
    _env: JNIEnv,
    _this: JObject,
) {
    if let Ok(mut db) = magnetic_db().lock() {
        db.clear();
    }
    if let Ok(mut result) = last_magnetic_match().lock() {
        *result = None;
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticDbAddFingerprint(
    _env: JNIEnv,
    _this: JObject,
    id: JInt,
    lat: JDouble,
    lon: JDouble,
    floor: JInt,
    fx: JDouble,
    fy: JDouble,
    fz: JDouble,
) {
    if id < 0
        || !lat.is_finite()
        || !lon.is_finite()
        || !fx.is_finite()
        || !fy.is_finite()
        || !fz.is_finite()
    {
        return;
    }

    if let Ok(mut db) = magnetic_db().lock() {
        db.add_fingerprint(MagneticFingerprint {
            id: id as u32,
            latitude: lat,
            longitude: lon,
            floor_index: floor,
            field_x: fx,
            field_y: fy,
            field_z: fz,
            magnitude: magnetic_magnitude(fx, fy, fz),
        });
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticDbMatch(
    _env: JNIEnv,
    _this: JObject,
    fx: JDouble,
    fy: JDouble,
    fz: JDouble,
    k: JInt,
) -> JInt {
    let result = if k <= 0 {
        None
    } else {
        magnetic_db()
            .lock()
            .ok()
            .and_then(|db| db.match_position(fx, fy, fz, k as usize))
    };

    let found = result.is_some();
    if let Ok(mut last_result) = last_magnetic_match().lock() {
        *last_result = result;
    }

    if found {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticMatchLatitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_magnetic_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.latitude))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticMatchLongitude(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_magnetic_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.longitude))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticMatchFloor(
    _env: JNIEnv,
    _this: JObject,
) -> JInt {
    last_magnetic_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.floor_index))
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeMagneticMatchConfidence(
    _env: JNIEnv,
    _this: JObject,
) -> JDouble {
    last_magnetic_match()
        .lock()
        .ok()
        .and_then(|result| result.as_ref().map(|r| r.confidence))
        .unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeFloorDetectorClear(
    _env: JNIEnv,
    _this: JObject,
) {
    if let Ok(mut detector) = floor_detector().lock() {
        detector.clear();
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeFloorDetectorAddProfile(
    _env: JNIEnv,
    _this: JObject,
    floor_index: JInt,
    ref_pressure_hpa: JDouble,
    rel_alt_meters: JDouble,
) {
    if let Ok(mut detector) = floor_detector().lock() {
        detector.add_profile(FloorProfile {
            floor_index,
            reference_pressure_hpa: ref_pressure_hpa,
            relative_altitude_meters: rel_alt_meters,
        });
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeFloorDetectorUpdate(
    _env: JNIEnv,
    _this: JObject,
    pressure_hpa: JDouble,
) -> JInt {
    floor_detector()
        .lock()
        .map(|mut detector| detector.update(pressure_hpa))
        .unwrap_or(0)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSamplingRecommendedIntervalNanos(
    _env: JNIEnv,
    _this: JObject,
) -> JLong {
    sampling_controller()
        .lock()
        .map(|controller| controller.recommended_interval_nanos())
        .unwrap_or(1_000_000_000)
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSamplingShouldSample(
    _env: JNIEnv,
    _this: JObject,
    current_nanos: JLong,
) -> JByte {
    let should_sample = sampling_controller()
        .lock()
        .map(|mut controller| controller.should_sample(current_nanos))
        .unwrap_or(false);

    if should_sample {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSamplingSetMotionState(
    _env: JNIEnv,
    _this: JObject,
    state: JInt,
) {
    if let Ok(mut controller) = sampling_controller().lock() {
        controller.update_motion_state(state);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSamplingSetScreenOn(
    _env: JNIEnv,
    _this: JObject,
    on: JByte,
) {
    if let Ok(mut controller) = sampling_controller().lock() {
        controller.set_screen_on(on != 0);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_campusar_app_nativebridge_NativeNavigationEngine_nativeSamplingSetNavigationActive(
    _env: JNIEnv,
    _this: JObject,
    active: JByte,
) {
    if let Ok(mut controller) = sampling_controller().lock() {
        controller.set_navigation_active(active != 0);
    }
}
