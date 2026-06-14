use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ApReading {
    pub bssid_hash: u64,
    pub rssi_dbm: i8,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WifiFingerprint {
    pub id: u32,
    pub latitude: f64,
    pub longitude: f64,
    pub floor_index: i32,
    pub readings: Vec<ApReading>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WifiMatchResult {
    pub latitude: f64,
    pub longitude: f64,
    pub floor_index: i32,
    pub confidence: f64,
    pub matched_ap_count: u32,
}

#[derive(Debug, Clone, Default)]
pub struct WifiFingerprintDb {
    fingerprints: Vec<WifiFingerprint>,
}

#[derive(Debug, Clone, Copy)]
struct Candidate {
    id: u32,
    latitude: f64,
    longitude: f64,
    floor_index: i32,
    distance: f64,
    matched_ap_count: u32,
}

impl WifiFingerprintDb {
    pub fn new() -> Self {
        Self {
            fingerprints: Vec::new(),
        }
    }

    pub fn load(fingerprints: Vec<WifiFingerprint>) -> Self {
        let mut db = Self::new();
        for fingerprint in fingerprints {
            db.add_fingerprint(fingerprint);
        }
        db
    }

    pub fn clear(&mut self) {
        self.fingerprints.clear();
    }

    pub fn add_fingerprint(&mut self, fingerprint: WifiFingerprint) {
        if !fingerprint.latitude.is_finite()
            || !fingerprint.longitude.is_finite()
            || fingerprint.readings.is_empty()
        {
            return;
        }

        self.fingerprints.push(fingerprint);
    }

    pub fn len(&self) -> usize {
        self.fingerprints.len()
    }

    pub fn is_empty(&self) -> bool {
        self.fingerprints.is_empty()
    }

    pub fn match_position(&self, scan: &[ApReading], k: usize) -> Option<WifiMatchResult> {
        if self.fingerprints.is_empty() || scan.is_empty() || k == 0 {
            return None;
        }

        let mut scan_by_bssid = HashMap::with_capacity(scan.len());
        for reading in scan {
            scan_by_bssid.insert(reading.bssid_hash, reading.rssi_dbm);
        }
        if scan_by_bssid.is_empty() {
            return None;
        }

        let mut candidates = Vec::new();
        for fingerprint in &self.fingerprints {
            let mut squared_distance = 0.0;
            let mut matched_ap_count = 0_u32;

            for reading in &fingerprint.readings {
                if let Some(scan_rssi) = scan_by_bssid.get(&reading.bssid_hash) {
                    let delta = *scan_rssi as f64 - reading.rssi_dbm as f64;
                    squared_distance += delta * delta;
                    matched_ap_count = matched_ap_count.saturating_add(1);
                }
            }

            if matched_ap_count > 0 {
                candidates.push(Candidate {
                    id: fingerprint.id,
                    latitude: fingerprint.latitude,
                    longitude: fingerprint.longitude,
                    floor_index: fingerprint.floor_index,
                    distance: squared_distance.sqrt(),
                    matched_ap_count,
                });
            }
        }

        if candidates.is_empty() {
            return None;
        }

        candidates.sort_by(|a, b| {
            a.distance
                .total_cmp(&b.distance)
                .then_with(|| b.matched_ap_count.cmp(&a.matched_ap_count))
                .then_with(|| a.id.cmp(&b.id))
        });

        let selected_count = candidates.len().min(k);
        let selected = &candidates[..selected_count];
        let mut weight_sum = 0.0;
        let mut latitude_sum = 0.0;
        let mut longitude_sum = 0.0;
        let mut floor_sum = 0.0;
        let mut distance_sum = 0.0;
        let mut matched_count_sum = 0.0;

        for candidate in selected {
            let weight = candidate.matched_ap_count as f64 / (candidate.distance + 1.0);
            weight_sum += weight;
            latitude_sum += candidate.latitude * weight;
            longitude_sum += candidate.longitude * weight;
            floor_sum += candidate.floor_index as f64 * weight;
            distance_sum += candidate.distance * weight;
            matched_count_sum += candidate.matched_ap_count as f64 * weight;
        }

        if !weight_sum.is_finite() || weight_sum <= 0.0 {
            return None;
        }

        let average_distance = distance_sum / weight_sum;
        let matched_ap_count = (matched_count_sum / weight_sum).round().max(0.0) as u32;
        let coverage = (matched_ap_count as f64 / scan_by_bssid.len() as f64).clamp(0.0, 1.0);
        let confidence = (1.0 / (1.0 + average_distance / 30.0) * coverage).clamp(0.0, 1.0);

        Some(WifiMatchResult {
            latitude: latitude_sum / weight_sum,
            longitude: longitude_sum / weight_sum,
            floor_index: (floor_sum / weight_sum).round() as i32,
            confidence,
            matched_ap_count,
        })
    }
}

pub fn fnv1a_hash_bssid(bssid: &str) -> u64 {
    const FNV_OFFSET_BASIS: u64 = 14_695_981_039_346_656_037;
    const FNV_PRIME: u64 = 1_099_511_628_211;

    let mut hash = FNV_OFFSET_BASIS;
    for byte in bssid.bytes() {
        hash ^= byte.to_ascii_lowercase() as u64;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ap(name: &str, rssi_dbm: i8) -> ApReading {
        ApReading {
            bssid_hash: fnv1a_hash_bssid(name),
            rssi_dbm,
        }
    }

    fn fingerprint(id: u32, latitude: f64, longitude: f64, floor_index: i32) -> WifiFingerprint {
        WifiFingerprint {
            id,
            latitude,
            longitude,
            floor_index,
            readings: vec![ap("aa:bb:cc:00:00:01", -50), ap("aa:bb:cc:00:00:02", -70)],
        }
    }

    #[test]
    fn hash_is_case_insensitive_for_bssid_strings() {
        assert_eq!(
            fnv1a_hash_bssid("AA:BB:CC:00:00:01"),
            fnv1a_hash_bssid("aa:bb:cc:00:00:01")
        );
    }

    #[test]
    fn empty_database_returns_no_match() {
        let db = WifiFingerprintDb::new();
        assert!(db.match_position(&[ap("a", -40)], 1).is_none());
    }

    #[test]
    fn no_matching_access_points_returns_no_match() {
        let db = WifiFingerprintDb::load(vec![fingerprint(1, 23.246, 77.502, 0)]);
        assert!(db.match_position(&[ap("different", -40)], 1).is_none());
    }

    #[test]
    fn exact_match_returns_fingerprint_position_with_high_confidence() {
        let db = WifiFingerprintDb::load(vec![
            fingerprint(1, 23.246, 77.502, 0),
            WifiFingerprint {
                id: 2,
                latitude: 23.250,
                longitude: 77.510,
                floor_index: 1,
                readings: vec![ap("aa:bb:cc:00:00:01", -80), ap("aa:bb:cc:00:00:02", -90)],
            },
        ]);

        let result = db.match_position(
            &[ap("aa:bb:cc:00:00:01", -50), ap("aa:bb:cc:00:00:02", -70)],
            1,
        );
        assert!(result.is_some());
        let result = result.unwrap_or(WifiMatchResult {
            latitude: 0.0,
            longitude: 0.0,
            floor_index: -1,
            confidence: 0.0,
            matched_ap_count: 0,
        });

        assert!((result.latitude - 23.246).abs() < 0.000001);
        assert!((result.longitude - 77.502).abs() < 0.000001);
        assert_eq!(result.floor_index, 0);
        assert_eq!(result.matched_ap_count, 2);
        assert!(result.confidence > 0.95);
    }

    #[test]
    fn k_nearest_uses_weighted_average() {
        let db = WifiFingerprintDb::load(vec![
            fingerprint(1, 0.0, 0.0, 0),
            WifiFingerprint {
                id: 2,
                latitude: 10.0,
                longitude: 10.0,
                floor_index: 2,
                readings: vec![ap("aa:bb:cc:00:00:01", -55), ap("aa:bb:cc:00:00:02", -75)],
            },
        ]);

        let result = db.match_position(
            &[ap("aa:bb:cc:00:00:01", -52), ap("aa:bb:cc:00:00:02", -72)],
            2,
        );
        assert!(result.is_some());
        let result = result.unwrap_or(WifiMatchResult {
            latitude: 0.0,
            longitude: 0.0,
            floor_index: 0,
            confidence: 0.0,
            matched_ap_count: 0,
        });

        assert!(result.latitude > 0.0);
        assert!(result.latitude < 10.0);
        assert!(result.confidence > 0.0);
    }

    #[test]
    fn load_filters_invalid_fingerprints() {
        let db = WifiFingerprintDb::load(vec![
            fingerprint(1, 23.246, 77.502, 0),
            WifiFingerprint {
                id: 2,
                latitude: f64::NAN,
                longitude: 77.502,
                floor_index: 0,
                readings: vec![ap("a", -50)],
            },
        ]);

        assert_eq!(db.len(), 1);
    }
}
