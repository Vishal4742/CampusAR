use std::ffi::c_void;

use std::sync::Mutex;

use crate::navigation::bearing::{distance_meters, initial_bearing_degrees};
use crate::sensors::heading::{heading_confidence_from_accuracy, smooth_heading_degrees};
use crate::sensors::motion::{
    acceleration_delta_from_gravity, classify_motion_state, gyro_magnitude,
};
use crate::sensors::pdr::{dead_reckon_delta, estimate_step_length_meters};
use crate::sensors::position::{
    estimated_position, init_from_gps, update_gps, update_pdr, PositionState,
};
use crate::utils::math::{arrival_reached, proximity_scale, signed_delta_degrees};
use crate::ENGINE_VERSION_CODE;

type JNIEnv = *mut c_void;
type JObject = *mut c_void;
type JBoolean = u8;
type JDouble = f64;
type JInt = i32;
type JLong = i64;

static POSITION_STATE: Mutex<Option<PositionState>> = Mutex::new(None);

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
