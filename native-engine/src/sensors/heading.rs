use crate::utils::math::{normalize_degrees, signed_delta_degrees};

pub fn smooth_heading_degrees(
    previous_heading_degrees: f64,
    measured_heading_degrees: f64,
    responsiveness: f64,
) -> f64 {
    if !measured_heading_degrees.is_finite() {
        return normalize_degrees(previous_heading_degrees);
    }
    if !previous_heading_degrees.is_finite() {
        return normalize_degrees(measured_heading_degrees);
    }

    let amount = responsiveness.clamp(0.0, 1.0);
    let delta = signed_delta_degrees(previous_heading_degrees, measured_heading_degrees);
    normalize_degrees(previous_heading_degrees + delta * amount)
}

pub fn complementary_heading_degrees(
    previous_heading_degrees: f64,
    gyro_delta_degrees: f64,
    magnetometer_heading_degrees: f64,
    magnetometer_weight: f64,
) -> f64 {
    if !previous_heading_degrees.is_finite() {
        return normalize_degrees(magnetometer_heading_degrees);
    }

    let predicted_heading = normalize_degrees(previous_heading_degrees + gyro_delta_degrees);
    smooth_heading_degrees(
        predicted_heading,
        magnetometer_heading_degrees,
        magnetometer_weight,
    )
}

pub fn heading_confidence_from_accuracy(sensor_accuracy: i32) -> f64 {
    match sensor_accuracy {
        3 => 1.0,
        2 => 0.66,
        1 => 0.33,
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn smooth_heading_crosses_zero_by_shortest_turn() {
        let heading = smooth_heading_degrees(350.0, 10.0, 0.5);

        assert!((heading - 0.0).abs() < 0.0001);
    }

    #[test]
    fn smooth_heading_clamps_responsiveness() {
        assert_eq!(smooth_heading_degrees(90.0, 180.0, -1.0), 90.0);
        assert_eq!(smooth_heading_degrees(90.0, 180.0, 2.0), 180.0);
    }

    #[test]
    fn complementary_heading_applies_gyro_then_magnetometer_correction() {
        let heading = complementary_heading_degrees(30.0, 10.0, 60.0, 0.25);

        assert!((heading - 45.0).abs() < 0.0001);
    }

    #[test]
    fn confidence_maps_android_accuracy_levels() {
        assert_eq!(heading_confidence_from_accuracy(3), 1.0);
        assert_eq!(heading_confidence_from_accuracy(0), 0.0);
    }
}
