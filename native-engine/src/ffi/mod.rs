use std::ffi::c_void;

use crate::navigation::bearing::{distance_meters, initial_bearing_degrees};
use crate::utils::math::{arrival_reached, proximity_scale, signed_delta_degrees};
use crate::ENGINE_VERSION_CODE;

type JNIEnv = *mut c_void;
type JObject = *mut c_void;
type JBoolean = u8;
type JDouble = f64;
type JInt = i32;

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
