pub fn normalize_degrees(angle_degrees: f64) -> f64 {
    if !angle_degrees.is_finite() {
        return f64::NAN;
    }

    let mut normalized = angle_degrees % 360.0;
    if normalized < 0.0 {
        normalized += 360.0;
    }

    if normalized >= 360.0 {
        0.0
    } else {
        normalized
    }
}

pub fn signed_delta_degrees(current_degrees: f64, target_degrees: f64) -> f64 {
    let delta = normalize_degrees(target_degrees - current_degrees);

    if delta > 180.0 {
        delta - 360.0
    } else {
        delta
    }
}

pub fn proximity_scale(distance_meters: f64) -> f64 {
    if !distance_meters.is_finite() {
        return 1.0;
    }

    if distance_meters >= 50.0 {
        1.0
    } else if distance_meters <= 5.0 {
        1.15
    } else {
        let progress = (50.0 - distance_meters) / 45.0;
        1.0 + progress * 0.15
    }
}

pub fn arrival_reached(distance_meters: f64) -> bool {
    distance_meters.is_finite() && distance_meters < 3.0
}
