use crate::sensors::pdr::dead_reckon_delta;

pub struct PositionState {
    pub latitude: f64,
    pub longitude: f64,
    pub heading_degrees: f64,
    pub speed_meters_per_second: f64,
    pub last_gps_epoch_millis: i64,
    pub pdr_north_accumulated: f64,
    pub pdr_east_accumulated: f64,
    pub gps_weight: f64,
}

pub fn init_from_gps(latitude: f64, longitude: f64, heading_degrees: f64) -> PositionState {
    PositionState {
        latitude,
        longitude,
        heading_degrees,
        speed_meters_per_second: 0.0,
        last_gps_epoch_millis: 0,
        pdr_north_accumulated: 0.0,
        pdr_east_accumulated: 0.0,
        gps_weight: 1.0,
    }
}

pub fn update_gps(
    state: &mut PositionState,
    latitude: f64,
    longitude: f64,
    accuracy_meters: f64,
    epoch_millis: i64,
) {
    if !latitude.is_finite() || !longitude.is_finite() || !accuracy_meters.is_finite() {
        return;
    }

    let gps_weight = if accuracy_meters <= 5.0 {
        0.8
    } else if accuracy_meters <= 15.0 {
        0.5
    } else if accuracy_meters <= 20.0 {
        0.2
    } else {
        0.1
    };

    state.latitude += gps_weight * (latitude - state.latitude);
    state.longitude += gps_weight * (longitude - state.longitude);
    state.pdr_north_accumulated = 0.0;
    state.pdr_east_accumulated = 0.0;
    state.last_gps_epoch_millis = epoch_millis;
    state.gps_weight = gps_weight;
}

pub fn update_pdr(
    state: &mut PositionState,
    heading_degrees: f64,
    step_length_meters: f64,
    step_count: u32,
) {
    let (north_meters, east_meters) =
        dead_reckon_delta(heading_degrees, step_length_meters, step_count);
    if north_meters.is_nan() || east_meters.is_nan() {
        return;
    }

    let pdr_factor = 1.0 - state.gps_weight;
    let lat_radians = state.latitude.to_radians();
    let delta_lat_deg = north_meters / 111_320.0;
    let delta_lon_deg = east_meters / (111_320.0 * lat_radians.cos());

    state.latitude += pdr_factor * delta_lat_deg;
    state.longitude += pdr_factor * delta_lon_deg;
    state.pdr_north_accumulated += north_meters;
    state.pdr_east_accumulated += east_meters;
}

pub fn estimated_position(state: &PositionState) -> (f64, f64) {
    (state.latitude, state.longitude)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_from_gps_sets_latitude_longitude_heading_correctly() {
        let state = init_from_gps(23.246, 77.502, 45.0);
        assert!((state.latitude - 23.246).abs() < 0.0001);
        assert!((state.longitude - 77.502).abs() < 0.0001);
        assert!((state.heading_degrees - 45.0).abs() < 0.0001);
        assert!((state.gps_weight - 1.0).abs() < 0.0001);
    }

    #[test]
    fn update_gps_with_accuracy_le_5_sets_gps_weight_to_0_8_and_blends_toward_fix() {
        let mut state = init_from_gps(23.246, 77.502, 0.0);
        update_gps(&mut state, 23.247, 77.503, 3.0, 1000);
        assert!((state.gps_weight - 0.8).abs() < 0.0001);
        assert!((state.latitude - 23.2468).abs() < 0.0001);
        assert!((state.longitude - 77.5028).abs() < 0.0001);
    }

    #[test]
    fn update_gps_with_accuracy_gt_20_sets_gps_weight_to_0_1() {
        let mut state = init_from_gps(23.246, 77.502, 0.0);
        update_gps(&mut state, 23.247, 77.503, 25.0, 1000);
        assert!((state.gps_weight - 0.1).abs() < 0.0001);
    }

    #[test]
    fn update_pdr_heading_due_north_increments_latitude() {
        let mut state = init_from_gps(23.246, 77.502, 0.0);
        state.gps_weight = 0.5;
        let lat_before = state.latitude;
        update_pdr(&mut state, 0.0, 0.72, 3);
        assert!(state.latitude > lat_before);
        assert!((state.longitude - 77.502).abs() < 0.0001);
    }
}
