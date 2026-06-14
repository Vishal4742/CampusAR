const DEFAULT_HYSTERESIS_METERS: f64 = 1.5;
const STANDARD_ATMOSPHERE_EXPONENT: f64 = 0.190_294_957_183_634_65;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FloorProfile {
    pub floor_index: i32,
    pub reference_pressure_hpa: f64,
    pub relative_altitude_meters: f64,
}

#[derive(Debug, Clone)]
pub struct FloorDetector {
    profiles: Vec<FloorProfile>,
    current_floor: i32,
    pub hysteresis_meters: f64,
}

impl FloorDetector {
    pub fn new() -> Self {
        Self {
            profiles: Vec::new(),
            current_floor: 0,
            hysteresis_meters: DEFAULT_HYSTERESIS_METERS,
        }
    }

    pub fn load(profiles: Vec<FloorProfile>) -> Self {
        let mut detector = Self::new();
        for profile in profiles {
            detector.add_profile(profile);
        }
        detector
    }

    pub fn clear(&mut self) {
        self.profiles.clear();
        self.current_floor = 0;
    }

    pub fn add_profile(&mut self, profile: FloorProfile) {
        if !profile.reference_pressure_hpa.is_finite()
            || profile.reference_pressure_hpa <= 0.0
            || !profile.relative_altitude_meters.is_finite()
        {
            return;
        }

        let was_empty = self.profiles.is_empty();
        self.profiles.push(profile);
        self.profiles.sort_by(|a, b| {
            a.relative_altitude_meters
                .total_cmp(&b.relative_altitude_meters)
                .then_with(|| a.floor_index.cmp(&b.floor_index))
        });
        if was_empty {
            self.current_floor = self.profiles[0].floor_index;
        }
    }

    pub fn update(&mut self, pressure_hpa: f64) -> i32 {
        if self.profiles.is_empty() || !pressure_hpa.is_finite() || pressure_hpa <= 0.0 {
            return self.current_floor;
        }

        let Some(current_altitude_meters) = self.current_relative_altitude(pressure_hpa) else {
            return self.current_floor;
        };
        let Some(candidate) = self.nearest_profile(current_altitude_meters) else {
            return self.current_floor;
        };

        if candidate.floor_index == self.current_floor {
            return self.current_floor;
        }

        if let Some(current_profile) = self.current_profile() {
            let current_error =
                (current_altitude_meters - current_profile.relative_altitude_meters).abs();
            let candidate_error =
                (current_altitude_meters - candidate.relative_altitude_meters).abs();
            if candidate_error + self.hysteresis_meters >= current_error {
                return self.current_floor;
            }
        }

        self.current_floor = candidate.floor_index;
        self.current_floor
    }

    pub fn current_floor(&self) -> i32 {
        self.current_floor
    }

    pub fn profile_count(&self) -> usize {
        self.profiles.len()
    }

    fn current_relative_altitude(&self, pressure_hpa: f64) -> Option<f64> {
        let baseline = self.profiles.first()?;
        pressure_to_relative_altitude_meters(pressure_hpa, baseline.reference_pressure_hpa)
            .map(|delta| baseline.relative_altitude_meters + delta)
    }

    fn nearest_profile(&self, altitude_meters: f64) -> Option<FloorProfile> {
        let mut nearest = None;
        for profile in &self.profiles {
            let distance = (altitude_meters - profile.relative_altitude_meters).abs();
            match nearest {
                Some((_, best_distance)) if distance >= best_distance => {}
                _ => nearest = Some((*profile, distance)),
            }
        }

        nearest.map(|(profile, _)| profile)
    }

    fn current_profile(&self) -> Option<FloorProfile> {
        self.profiles
            .iter()
            .find(|profile| profile.floor_index == self.current_floor)
            .copied()
    }
}

impl Default for FloorDetector {
    fn default() -> Self {
        Self::new()
    }
}

pub fn pressure_to_relative_altitude_meters(
    pressure_hpa: f64,
    reference_pressure_hpa: f64,
) -> Option<f64> {
    if !pressure_hpa.is_finite()
        || !reference_pressure_hpa.is_finite()
        || pressure_hpa <= 0.0
        || reference_pressure_hpa <= 0.0
    {
        return None;
    }

    Some(
        44_330.0
            * (1.0 - (pressure_hpa / reference_pressure_hpa).powf(STANDARD_ATMOSPHERE_EXPONENT)),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(floor_index: i32, relative_altitude_meters: f64) -> FloorProfile {
        FloorProfile {
            floor_index,
            reference_pressure_hpa: 1013.25,
            relative_altitude_meters,
        }
    }

    fn pressure_for_altitude(relative_altitude_meters: f64) -> f64 {
        1013.25
            * (1.0 - relative_altitude_meters / 44_330.0).powf(1.0 / STANDARD_ATMOSPHERE_EXPONENT)
    }

    #[test]
    fn no_profiles_returns_current_floor() {
        let mut detector = FloorDetector::new();
        assert_eq!(detector.update(1013.25), 0);
    }

    #[test]
    fn load_filters_invalid_profiles() {
        let detector = FloorDetector::load(vec![
            profile(0, 0.0),
            FloorProfile {
                floor_index: 1,
                reference_pressure_hpa: f64::NAN,
                relative_altitude_meters: 4.0,
            },
        ]);

        assert_eq!(detector.profile_count(), 1);
        assert_eq!(detector.current_floor(), 0);
    }

    #[test]
    fn pressure_update_detects_nearest_floor() {
        let mut detector = FloorDetector::load(vec![profile(0, 0.0), profile(1, 4.0)]);

        let floor = detector.update(pressure_for_altitude(4.2));

        assert_eq!(floor, 1);
    }

    #[test]
    fn hysteresis_prevents_floor_switching_near_midpoint() {
        let mut detector = FloorDetector::load(vec![profile(0, 0.0), profile(1, 4.0)]);

        let floor = detector.update(pressure_for_altitude(2.2));

        assert_eq!(floor, 0);
    }

    #[test]
    fn invalid_pressure_keeps_current_floor() {
        let mut detector = FloorDetector::load(vec![profile(0, 0.0), profile(1, 4.0)]);
        detector.update(pressure_for_altitude(4.5));

        assert_eq!(detector.update(f64::NAN), 1);
    }
}
