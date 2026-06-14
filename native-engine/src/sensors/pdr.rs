const DEFAULT_STEP_LENGTH_METERS: f64 = 0.72;
const MIN_STEP_INTERVAL_NANOS: i64 = 250_000_000;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StepDetectionState {
    pub last_step_timestamp_nanos: i64,
    pub previous_accel_delta: f64,
    pub step_count: u32,
}

impl Default for StepDetectionState {
    fn default() -> Self {
        Self {
            last_step_timestamp_nanos: i64::MIN,
            previous_accel_delta: 0.0,
            step_count: 0,
        }
    }
}

pub fn detect_step(
    state: &mut StepDetectionState,
    timestamp_nanos: i64,
    accel_delta_from_gravity: f64,
    threshold: f64,
) -> bool {
    if !accel_delta_from_gravity.is_finite() || !threshold.is_finite() || threshold <= 0.0 {
        state.previous_accel_delta = accel_delta_from_gravity;
        return false;
    }

    let crossed_threshold =
        state.previous_accel_delta <= threshold && accel_delta_from_gravity > threshold;
    let enough_time_passed = state.last_step_timestamp_nanos == i64::MIN
        || timestamp_nanos.saturating_sub(state.last_step_timestamp_nanos)
            >= MIN_STEP_INTERVAL_NANOS;

    state.previous_accel_delta = accel_delta_from_gravity;

    if crossed_threshold && enough_time_passed {
        state.last_step_timestamp_nanos = timestamp_nanos;
        state.step_count = state.step_count.saturating_add(1);
        true
    } else {
        false
    }
}

pub fn estimate_step_length_meters(user_height_meters: f64, motion_state: i32) -> f64 {
    if !user_height_meters.is_finite() || user_height_meters <= 0.0 {
        return DEFAULT_STEP_LENGTH_METERS;
    }

    let base = (user_height_meters * 0.415).clamp(0.45, 1.0);
    match motion_state {
        1 => base * 0.5,
        2 => base,
        3 => (base * 1.15).min(1.2),
        _ => base,
    }
}

pub fn dead_reckon_delta(
    heading_degrees: f64,
    step_length_meters: f64,
    step_count: u32,
) -> (f64, f64) {
    if !heading_degrees.is_finite() || !step_length_meters.is_finite() {
        return (f64::NAN, f64::NAN);
    }

    let distance = step_length_meters.max(0.0) * step_count as f64;
    let heading_radians = heading_degrees.to_radians();
    let north_meters = distance * heading_radians.cos();
    let east_meters = distance * heading_radians.sin();
    (north_meters, east_meters)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sensors::motion::{MOTION_STATE_ACTIVE, MOTION_STATE_IDLE, MOTION_STATE_WALKING};

    #[test]
    fn detects_threshold_crossing_with_cooldown() {
        let mut state = StepDetectionState::default();

        assert!(!detect_step(&mut state, 0, 0.2, 1.0));
        assert!(detect_step(&mut state, 100_000_000, 1.2, 1.0));
        assert!(!detect_step(&mut state, 200_000_000, 0.3, 1.0));
        assert!(!detect_step(&mut state, 250_000_000, 1.3, 1.0));
        assert!(!detect_step(&mut state, 380_000_000, 0.3, 1.0));
        assert!(detect_step(&mut state, 400_000_000, 1.4, 1.0));
        assert_eq!(state.step_count, 2);
    }

    #[test]
    fn estimates_step_length_from_height_and_motion() {
        let walking = estimate_step_length_meters(1.7, MOTION_STATE_WALKING);
        let idle = estimate_step_length_meters(1.7, MOTION_STATE_IDLE);
        let active = estimate_step_length_meters(1.7, MOTION_STATE_ACTIVE);

        assert!(idle < walking);
        assert!(active > walking);
    }

    #[test]
    fn dead_reckoning_uses_heading_axes() {
        let (north, east) = dead_reckon_delta(90.0, 1.0, 3);

        assert!(north.abs() < 0.0001);
        assert!((east - 3.0).abs() < 0.0001);
    }
}
