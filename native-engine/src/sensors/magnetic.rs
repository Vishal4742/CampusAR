#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MagneticFingerprint {
    pub id: u32,
    pub latitude: f64,
    pub longitude: f64,
    pub floor_index: i32,
    pub field_x: f64,
    pub field_y: f64,
    pub field_z: f64,
    pub magnitude: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MagneticMatchResult {
    pub latitude: f64,
    pub longitude: f64,
    pub floor_index: i32,
    pub confidence: f64,
}

#[derive(Debug, Clone, Default)]
pub struct MagneticFingerprintDb {
    fingerprints: Vec<MagneticFingerprint>,
}

#[derive(Debug, Clone, Copy)]
struct Candidate {
    id: u32,
    latitude: f64,
    longitude: f64,
    floor_index: i32,
    distance: f64,
}

impl MagneticFingerprintDb {
    pub fn new() -> Self {
        Self {
            fingerprints: Vec::new(),
        }
    }

    pub fn load(fingerprints: Vec<MagneticFingerprint>) -> Self {
        let mut db = Self::new();
        for fingerprint in fingerprints {
            db.add_fingerprint(fingerprint);
        }
        db
    }

    pub fn clear(&mut self) {
        self.fingerprints.clear();
    }

    pub fn add_fingerprint(&mut self, mut fingerprint: MagneticFingerprint) {
        if !fingerprint.latitude.is_finite()
            || !fingerprint.longitude.is_finite()
            || !fingerprint.field_x.is_finite()
            || !fingerprint.field_y.is_finite()
            || !fingerprint.field_z.is_finite()
        {
            return;
        }

        if !fingerprint.magnitude.is_finite() {
            fingerprint.magnitude = magnetic_magnitude(
                fingerprint.field_x,
                fingerprint.field_y,
                fingerprint.field_z,
            );
        }

        self.fingerprints.push(fingerprint);
    }

    pub fn len(&self) -> usize {
        self.fingerprints.len()
    }

    pub fn match_position(
        &self,
        field_x: f64,
        field_y: f64,
        field_z: f64,
        k: usize,
    ) -> Option<MagneticMatchResult> {
        if self.fingerprints.is_empty()
            || k == 0
            || !field_x.is_finite()
            || !field_y.is_finite()
            || !field_z.is_finite()
        {
            return None;
        }

        let mut candidates = Vec::with_capacity(self.fingerprints.len());
        for fingerprint in &self.fingerprints {
            let dx = field_x - fingerprint.field_x;
            let dy = field_y - fingerprint.field_y;
            let dz = field_z - fingerprint.field_z;
            let distance = (dx * dx + dy * dy + dz * dz).sqrt();
            if distance.is_finite() {
                candidates.push(Candidate {
                    id: fingerprint.id,
                    latitude: fingerprint.latitude,
                    longitude: fingerprint.longitude,
                    floor_index: fingerprint.floor_index,
                    distance,
                });
            }
        }

        if candidates.is_empty() {
            return None;
        }

        candidates.sort_by(|a, b| {
            a.distance
                .total_cmp(&b.distance)
                .then_with(|| a.id.cmp(&b.id))
        });

        let selected_count = candidates.len().min(k);
        let selected = &candidates[..selected_count];
        let mut weight_sum = 0.0;
        let mut latitude_sum = 0.0;
        let mut longitude_sum = 0.0;
        let mut floor_sum = 0.0;
        let mut distance_sum = 0.0;

        for candidate in selected {
            let weight = 1.0 / (candidate.distance + 1.0);
            weight_sum += weight;
            latitude_sum += candidate.latitude * weight;
            longitude_sum += candidate.longitude * weight;
            floor_sum += candidate.floor_index as f64 * weight;
            distance_sum += candidate.distance * weight;
        }

        if !weight_sum.is_finite() || weight_sum <= 0.0 {
            return None;
        }

        let average_distance = distance_sum / weight_sum;
        let confidence = (1.0 / (1.0 + average_distance / 15.0)).clamp(0.0, 1.0);

        Some(MagneticMatchResult {
            latitude: latitude_sum / weight_sum,
            longitude: longitude_sum / weight_sum,
            floor_index: (floor_sum / weight_sum).round() as i32,
            confidence,
        })
    }
}

pub fn magnetic_magnitude(field_x: f64, field_y: f64, field_z: f64) -> f64 {
    if !field_x.is_finite() || !field_y.is_finite() || !field_z.is_finite() {
        return f64::NAN;
    }

    (field_x * field_x + field_y * field_y + field_z * field_z).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fingerprint(
        id: u32,
        latitude: f64,
        longitude: f64,
        floor_index: i32,
        field_x: f64,
        field_y: f64,
        field_z: f64,
    ) -> MagneticFingerprint {
        MagneticFingerprint {
            id,
            latitude,
            longitude,
            floor_index,
            field_x,
            field_y,
            field_z,
            magnitude: magnetic_magnitude(field_x, field_y, field_z),
        }
    }

    #[test]
    fn magnitude_uses_three_axes() {
        assert!((magnetic_magnitude(3.0, 4.0, 12.0) - 13.0).abs() < 0.000001);
    }

    #[test]
    fn empty_database_returns_no_match() {
        let db = MagneticFingerprintDb::new();
        assert!(db.match_position(1.0, 2.0, 3.0, 1).is_none());
    }

    #[test]
    fn invalid_scan_returns_no_match() {
        let db =
            MagneticFingerprintDb::load(vec![fingerprint(1, 23.246, 77.502, 0, 30.0, 4.0, 10.0)]);
        assert!(db.match_position(f64::NAN, 2.0, 3.0, 1).is_none());
    }

    #[test]
    fn exact_match_returns_fingerprint_position() {
        let db = MagneticFingerprintDb::load(vec![
            fingerprint(1, 23.246, 77.502, 0, 30.0, 4.0, 10.0),
            fingerprint(2, 23.260, 77.520, 1, 50.0, 4.0, 10.0),
        ]);

        let result = db.match_position(30.0, 4.0, 10.0, 1);
        assert!(result.is_some());
        let result = result.unwrap_or(MagneticMatchResult {
            latitude: 0.0,
            longitude: 0.0,
            floor_index: -1,
            confidence: 0.0,
        });

        assert!((result.latitude - 23.246).abs() < 0.000001);
        assert!((result.longitude - 77.502).abs() < 0.000001);
        assert_eq!(result.floor_index, 0);
        assert!(result.confidence > 0.95);
    }

    #[test]
    fn k_nearest_uses_weighted_average() {
        let db = MagneticFingerprintDb::load(vec![
            fingerprint(1, 0.0, 0.0, 0, 30.0, 4.0, 10.0),
            fingerprint(2, 10.0, 10.0, 2, 36.0, 4.0, 10.0),
        ]);

        let result = db.match_position(33.0, 4.0, 10.0, 2);
        assert!(result.is_some());
        let result = result.unwrap_or(MagneticMatchResult {
            latitude: 0.0,
            longitude: 0.0,
            floor_index: 0,
            confidence: 0.0,
        });

        assert!(result.latitude > 0.0);
        assert!(result.latitude < 10.0);
        assert!(result.confidence > 0.0);
    }

    #[test]
    fn load_filters_invalid_fingerprints() {
        let db = MagneticFingerprintDb::load(vec![
            fingerprint(1, 23.246, 77.502, 0, 30.0, 4.0, 10.0),
            fingerprint(2, f64::NAN, 77.502, 0, 30.0, 4.0, 10.0),
        ]);

        assert_eq!(db.len(), 1);
    }
}
