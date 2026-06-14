pub mod ffi;
pub mod navigation;
pub mod sensors;
pub mod utils;

use navigation::bearing::{distance_meters, initial_bearing_degrees};
use utils::math::{arrival_reached, proximity_scale, signed_delta_degrees};

pub const ENGINE_VERSION_CODE: i32 = 1;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OverlayState {
    pub distance_meters: f64,
    pub bearing_degrees: f64,
    pub heading_delta_degrees: f64,
    pub proximity_scale: f64,
    pub arrival: bool,
}

pub fn overlay_state(
    origin_latitude: f64,
    origin_longitude: f64,
    heading_degrees: f64,
    destination_latitude: f64,
    destination_longitude: f64,
) -> OverlayState {
    let distance_meters = distance_meters(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    );
    let bearing_degrees = initial_bearing_degrees(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    );

    OverlayState {
        distance_meters,
        bearing_degrees,
        heading_delta_degrees: signed_delta_degrees(heading_degrees, bearing_degrees),
        proximity_scale: proximity_scale(distance_meters),
        arrival: arrival_reached(distance_meters),
    }
}
