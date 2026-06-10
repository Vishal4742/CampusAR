use crate::utils::math::normalize_degrees;

const EARTH_RADIUS_METERS: f64 = 6_371_008.8;

pub fn distance_meters(
    origin_latitude: f64,
    origin_longitude: f64,
    destination_latitude: f64,
    destination_longitude: f64,
) -> f64 {
    if !all_finite(&[
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    ]) {
        return f64::NAN;
    }

    let lat1 = origin_latitude.to_radians();
    let lat2 = destination_latitude.to_radians();
    let delta_lat = (destination_latitude - origin_latitude).to_radians();
    let delta_lon = (destination_longitude - origin_longitude).to_radians();

    let a =
        (delta_lat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (delta_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_METERS * c
}

pub fn initial_bearing_degrees(
    origin_latitude: f64,
    origin_longitude: f64,
    destination_latitude: f64,
    destination_longitude: f64,
) -> f64 {
    if !all_finite(&[
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    ]) {
        return f64::NAN;
    }

    if distance_meters(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    ) < 0.01
    {
        return 0.0;
    }

    let lat1 = origin_latitude.to_radians();
    let lat2 = destination_latitude.to_radians();
    let delta_lon = (destination_longitude - origin_longitude).to_radians();

    let y = delta_lon.sin() * lat2.cos();
    let x = lat1.cos() * lat2.sin() - lat1.sin() * lat2.cos() * delta_lon.cos();

    normalize_degrees(y.atan2(x).to_degrees())
}

fn all_finite(values: &[f64]) -> bool {
    values.iter().all(|value| value.is_finite())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::math::{arrival_reached, proximity_scale, signed_delta_degrees};

    #[test]
    fn distance_for_one_equator_degree_is_about_111_km() {
        let distance = distance_meters(0.0, 0.0, 0.0, 1.0);

        assert!((distance - 111_195.0).abs() < 100.0);
    }

    #[test]
    fn bearing_due_east_is_90_degrees() {
        let bearing = initial_bearing_degrees(0.0, 0.0, 0.0, 1.0);

        assert!((bearing - 90.0).abs() < 0.0001);
    }

    #[test]
    fn bearing_due_north_is_zero_degrees() {
        let bearing = initial_bearing_degrees(0.0, 0.0, 1.0, 0.0);

        assert!((bearing - 0.0).abs() < 0.0001);
    }

    #[test]
    fn heading_delta_uses_shortest_turn() {
        assert_eq!(signed_delta_degrees(350.0, 10.0), 20.0);
        assert_eq!(signed_delta_degrees(10.0, 350.0), -20.0);
    }

    #[test]
    fn proximity_scale_increases_near_destination() {
        assert_eq!(proximity_scale(60.0), 1.0);
        assert_eq!(proximity_scale(5.0), 1.15);
        assert!(proximity_scale(20.0) > 1.0);
    }

    #[test]
    fn arrival_starts_under_three_meters() {
        assert!(arrival_reached(2.9));
        assert!(!arrival_reached(3.0));
    }
}
