const GRAVITY_METERS_PER_SECOND_SQUARED: f64 = 9.80665;

pub const MOTION_STATE_UNKNOWN: i32 = 0;
pub const MOTION_STATE_IDLE: i32 = 1;
pub const MOTION_STATE_WALKING: i32 = 2;
pub const MOTION_STATE_ACTIVE: i32 = 3;

pub fn acceleration_magnitude(x: f64, y: f64, z: f64) -> f64 {
    if !x.is_finite() || !y.is_finite() || !z.is_finite() {
        return f64::NAN;
    }

    (x * x + y * y + z * z).sqrt()
}

pub fn acceleration_delta_from_gravity(x: f64, y: f64, z: f64) -> f64 {
    let magnitude = acceleration_magnitude(x, y, z);
    if !magnitude.is_finite() {
        return f64::NAN;
    }

    magnitude - GRAVITY_METERS_PER_SECOND_SQUARED
}

pub fn classify_motion_state(
    acceleration_delta_from_gravity: f64,
    gyro_magnitude_radians_per_second: f64,
) -> i32 {
    if !acceleration_delta_from_gravity.is_finite()
        || !gyro_magnitude_radians_per_second.is_finite()
    {
        return MOTION_STATE_UNKNOWN;
    }

    let acceleration_delta = acceleration_delta_from_gravity.abs();
    let gyro_magnitude = gyro_magnitude_radians_per_second.abs();

    if acceleration_delta < 0.25 && gyro_magnitude < 0.05 {
        MOTION_STATE_IDLE
    } else if acceleration_delta < 2.5 && gyro_magnitude < 1.5 {
        MOTION_STATE_WALKING
    } else {
        MOTION_STATE_ACTIVE
    }
}

pub fn gyro_magnitude(x: f64, y: f64, z: f64) -> f64 {
    if !x.is_finite() || !y.is_finite() || !z.is_finite() {
        return f64::NAN;
    }

    (x * x + y * y + z * z).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acceleration_at_gravity_has_low_delta() {
        let delta = acceleration_delta_from_gravity(0.0, 0.0, GRAVITY_METERS_PER_SECOND_SQUARED);

        assert!(delta.abs() < 0.0001);
    }

    #[test]
    fn motion_classifier_identifies_idle_walking_and_active() {
        assert_eq!(classify_motion_state(0.1, 0.01), MOTION_STATE_IDLE);
        assert_eq!(classify_motion_state(1.2, 0.4), MOTION_STATE_WALKING);
        assert_eq!(classify_motion_state(4.0, 2.0), MOTION_STATE_ACTIVE);
    }

    #[test]
    fn motion_classifier_handles_invalid_values() {
        assert_eq!(classify_motion_state(f64::NAN, 0.0), MOTION_STATE_UNKNOWN);
    }
}
