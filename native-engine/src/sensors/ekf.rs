use nalgebra::{SMatrix, SVector};

use crate::utils::math::{normalize_degrees, signed_delta_degrees};

const METERS_PER_DEGREE_LATITUDE: f64 = 111_320.0;
const MIN_LONGITUDE_COSINE: f64 = 0.01;

pub type EkfVector = SVector<f64, 6>;
pub type EkfMatrix = SMatrix<f64, 6, 6>;

#[derive(Debug, Clone)]
pub struct EkfNoiseConfig {
    pub process_noise_diagonal: [f64; 6],
    pub initial_covariance_diagonal: [f64; 6],
    pub gps_accuracy_floor_meters: f64,
    pub heading_sigma_degrees: f64,
    pub wifi_sigma_meters: f64,
    pub magnetic_sigma_meters: f64,
    pub floor_sigma: f64,
}

impl Default for EkfNoiseConfig {
    fn default() -> Self {
        Self {
            process_noise_diagonal: [
                meters_to_latitude_degrees(0.6).powi(2),
                meters_to_latitude_degrees(0.6).powi(2),
                4.0,
                0.25,
                0.04,
                0.02,
            ],
            initial_covariance_diagonal: [
                meters_to_latitude_degrees(5.0).powi(2),
                meters_to_latitude_degrees(5.0).powi(2),
                25.0,
                1.0,
                0.25,
                1.0,
            ],
            gps_accuracy_floor_meters: 3.0,
            heading_sigma_degrees: 12.0,
            wifi_sigma_meters: 18.0,
            magnetic_sigma_meters: 12.0,
            floor_sigma: 0.5,
        }
    }
}

#[derive(Debug, Clone)]
pub struct EkfState {
    state: EkfVector,
    covariance: EkfMatrix,
    process_noise: EkfMatrix,
    config: EkfNoiseConfig,
}

impl EkfState {
    pub fn new(latitude: f64, longitude: f64, heading_degrees: f64, floor_index: i32) -> Self {
        Self::new_with_config(
            latitude,
            longitude,
            heading_degrees,
            floor_index,
            EkfNoiseConfig::default(),
        )
    }

    pub fn new_with_config(
        latitude: f64,
        longitude: f64,
        heading_degrees: f64,
        floor_index: i32,
        config: EkfNoiseConfig,
    ) -> Self {
        let mut state = EkfVector::zeros();
        state[0] = latitude;
        state[1] = longitude;
        state[2] = normalize_degrees(heading_degrees);
        state[3] = 0.0;
        state[4] = 0.0;
        state[5] = floor_index as f64;

        let covariance = diagonal_matrix(config.initial_covariance_diagonal);
        let process_noise = diagonal_matrix(config.process_noise_diagonal);

        Self {
            state,
            covariance,
            process_noise,
            config,
        }
    }

    pub fn latitude(&self) -> f64 {
        self.state[0]
    }

    pub fn longitude(&self) -> f64 {
        self.state[1]
    }

    pub fn heading_degrees(&self) -> f64 {
        normalize_degrees(self.state[2])
    }

    pub fn velocity_meters_per_second(&self) -> f64 {
        self.state[3]
    }

    pub fn step_length_meters(&self) -> f64 {
        self.state[4]
    }

    pub fn floor_index(&self) -> i32 {
        self.state[5].round() as i32
    }

    pub fn set_process_noise_diagonal(&mut self, diagonal: [f64; 6]) -> bool {
        if !diagonal
            .iter()
            .all(|value| value.is_finite() && *value >= 0.0)
        {
            return false;
        }

        self.config.process_noise_diagonal = diagonal;
        self.process_noise = diagonal_matrix(diagonal);
        true
    }

    pub fn set_measurement_noise(
        &mut self,
        gps_accuracy_floor_meters: f64,
        heading_sigma_degrees: f64,
        wifi_sigma_meters: f64,
        magnetic_sigma_meters: f64,
        floor_sigma: f64,
    ) -> bool {
        let values = [
            gps_accuracy_floor_meters,
            heading_sigma_degrees,
            wifi_sigma_meters,
            magnetic_sigma_meters,
            floor_sigma,
        ];
        if !values.iter().all(|value| value.is_finite() && *value > 0.0) {
            return false;
        }

        self.config.gps_accuracy_floor_meters = gps_accuracy_floor_meters;
        self.config.heading_sigma_degrees = heading_sigma_degrees;
        self.config.wifi_sigma_meters = wifi_sigma_meters;
        self.config.magnetic_sigma_meters = magnetic_sigma_meters;
        self.config.floor_sigma = floor_sigma;
        true
    }
}

pub fn init_ekf(
    latitude: f64,
    longitude: f64,
    heading_degrees: f64,
    floor_index: i32,
) -> Option<EkfState> {
    if !latitude.is_finite() || !longitude.is_finite() || !heading_degrees.is_finite() {
        return None;
    }

    Some(EkfState::new(
        latitude,
        longitude,
        heading_degrees,
        floor_index,
    ))
}

pub fn ekf_predict(
    state: &mut EkfState,
    heading_degrees: f64,
    step_length_meters: f64,
    dt_seconds: f64,
) {
    if !state_vector_is_finite(&state.state)
        || !heading_degrees.is_finite()
        || !step_length_meters.is_finite()
        || !dt_seconds.is_finite()
        || dt_seconds < 0.0
    {
        return;
    }

    let heading = normalize_degrees(heading_degrees);
    if !heading.is_finite() {
        return;
    }

    let distance_meters = step_length_meters.max(0.0);
    let heading_radians = heading.to_radians();
    let north_meters = distance_meters * heading_radians.cos();
    let east_meters = distance_meters * heading_radians.sin();
    let meters_per_longitude_degree = meters_per_longitude_degree(state.latitude());
    if !meters_per_longitude_degree.is_finite() || meters_per_longitude_degree <= 0.0 {
        return;
    }

    let mut transition = EkfMatrix::identity();
    let radians_per_degree = std::f64::consts::PI / 180.0;
    transition[(0, 2)] =
        -distance_meters * heading_radians.sin() * radians_per_degree / METERS_PER_DEGREE_LATITUDE;
    transition[(0, 4)] = heading_radians.cos() / METERS_PER_DEGREE_LATITUDE;
    transition[(1, 2)] =
        distance_meters * heading_radians.cos() * radians_per_degree / meters_per_longitude_degree;
    transition[(1, 4)] = heading_radians.sin() / meters_per_longitude_degree;
    if dt_seconds > 0.001 {
        transition[(3, 4)] = 1.0 / dt_seconds;
    }

    state.state[0] += north_meters / METERS_PER_DEGREE_LATITUDE;
    state.state[1] += east_meters / meters_per_longitude_degree;
    state.state[2] = heading;
    if dt_seconds > 0.001 {
        state.state[3] = distance_meters / dt_seconds;
    }
    state.state[4] = distance_meters;

    let process_scale = dt_seconds.clamp(0.05, 5.0);
    state.covariance = transition * state.covariance * transition.transpose()
        + state.process_noise * process_scale;
    symmetrize_covariance(&mut state.covariance);
}

pub fn ekf_update_gps(state: &mut EkfState, latitude: f64, longitude: f64, accuracy_meters: f64) {
    if !state_vector_is_finite(&state.state)
        || !latitude.is_finite()
        || !longitude.is_finite()
        || !accuracy_meters.is_finite()
    {
        return;
    }

    let accuracy = accuracy_meters
        .max(state.config.gps_accuracy_floor_meters)
        .max(0.1);
    update_position(
        state,
        latitude,
        longitude,
        meters_to_latitude_degrees(accuracy),
        meters_to_longitude_degrees(accuracy, state.latitude()),
    );
}

pub fn ekf_update_heading(state: &mut EkfState, heading_degrees: f64, confidence: f64) {
    if !state_vector_is_finite(&state.state)
        || !heading_degrees.is_finite()
        || !confidence.is_finite()
        || confidence <= 0.0
    {
        return;
    }

    let measured_heading = normalize_degrees(heading_degrees);
    let residual = signed_delta_degrees(state.heading_degrees(), measured_heading);
    if !residual.is_finite() {
        return;
    }

    let confidence = confidence.clamp(0.05, 1.0);
    let sigma = state.config.heading_sigma_degrees / confidence;
    update_scalar(state, 2, residual, sigma.powi(2));
    state.state[2] = normalize_degrees(state.state[2]);
}

pub fn ekf_update_wifi_position(
    state: &mut EkfState,
    latitude: f64,
    longitude: f64,
    confidence: f64,
) {
    update_confidence_position(
        state,
        latitude,
        longitude,
        confidence,
        state.config.wifi_sigma_meters,
    );
}

pub fn ekf_update_magnetic_position(
    state: &mut EkfState,
    latitude: f64,
    longitude: f64,
    confidence: f64,
) {
    update_confidence_position(
        state,
        latitude,
        longitude,
        confidence,
        state.config.magnetic_sigma_meters,
    );
}

pub fn ekf_update_floor(state: &mut EkfState, floor_index: i32) {
    if !state_vector_is_finite(&state.state) {
        return;
    }

    let residual = floor_index as f64 - state.state[5];
    update_scalar(state, 5, residual, state.config.floor_sigma.powi(2));
}

fn update_confidence_position(
    state: &mut EkfState,
    latitude: f64,
    longitude: f64,
    confidence: f64,
    base_sigma_meters: f64,
) {
    if !state_vector_is_finite(&state.state)
        || !latitude.is_finite()
        || !longitude.is_finite()
        || !confidence.is_finite()
        || confidence <= 0.0
        || !base_sigma_meters.is_finite()
        || base_sigma_meters <= 0.0
    {
        return;
    }

    let confidence = confidence.clamp(0.05, 1.0);
    let sigma_meters = base_sigma_meters / confidence;
    update_position(
        state,
        latitude,
        longitude,
        meters_to_latitude_degrees(sigma_meters),
        meters_to_longitude_degrees(sigma_meters, state.latitude()),
    );
}

fn update_position(
    state: &mut EkfState,
    latitude: f64,
    longitude: f64,
    latitude_sigma_degrees: f64,
    longitude_sigma_degrees: f64,
) {
    if !latitude_sigma_degrees.is_finite()
        || !longitude_sigma_degrees.is_finite()
        || latitude_sigma_degrees <= 0.0
        || longitude_sigma_degrees <= 0.0
    {
        return;
    }

    let mut observation = SMatrix::<f64, 2, 6>::zeros();
    observation[(0, 0)] = 1.0;
    observation[(1, 1)] = 1.0;
    let residual = SVector::<f64, 2>::new(latitude - state.state[0], longitude - state.state[1]);
    let mut noise = SMatrix::<f64, 2, 2>::zeros();
    noise[(0, 0)] = latitude_sigma_degrees.powi(2);
    noise[(1, 1)] = longitude_sigma_degrees.powi(2);

    update_two_dimensional(state, observation, residual, noise);
}

fn update_scalar(state: &mut EkfState, state_index: usize, residual: f64, variance: f64) {
    if state_index >= 6 || !residual.is_finite() || !variance.is_finite() || variance <= 0.0 {
        return;
    }

    let mut observation = SMatrix::<f64, 1, 6>::zeros();
    observation[(0, state_index)] = 1.0;
    let residual = SVector::<f64, 1>::new(residual);
    let noise = SMatrix::<f64, 1, 1>::from_element(variance);
    let innovation = observation * state.covariance * observation.transpose() + noise;
    let Some(innovation_inverse) = innovation.try_inverse() else {
        return;
    };

    let gain = state.covariance * observation.transpose() * innovation_inverse;
    state.state += gain * residual;
    joseph_update_covariance(&mut state.covariance, gain, observation, noise);
}

fn update_two_dimensional(
    state: &mut EkfState,
    observation: SMatrix<f64, 2, 6>,
    residual: SVector<f64, 2>,
    noise: SMatrix<f64, 2, 2>,
) {
    if !residual.iter().all(|value| value.is_finite())
        || !noise.iter().all(|value| value.is_finite())
    {
        return;
    }

    let innovation = observation * state.covariance * observation.transpose() + noise;
    let Some(innovation_inverse) = innovation.try_inverse() else {
        return;
    };

    let gain = state.covariance * observation.transpose() * innovation_inverse;
    state.state += gain * residual;
    joseph_update_covariance(&mut state.covariance, gain, observation, noise);
}

fn joseph_update_covariance<const M: usize>(
    covariance: &mut EkfMatrix,
    gain: SMatrix<f64, 6, M>,
    observation: SMatrix<f64, M, 6>,
    noise: SMatrix<f64, M, M>,
) {
    let identity = EkfMatrix::identity();
    let correction = identity - gain * observation;
    *covariance =
        correction * *covariance * correction.transpose() + gain * noise * gain.transpose();
    symmetrize_covariance(covariance);
}

fn diagonal_matrix(diagonal: [f64; 6]) -> EkfMatrix {
    let mut matrix = EkfMatrix::zeros();
    for (index, value) in diagonal.iter().enumerate() {
        matrix[(index, index)] = if value.is_finite() && *value >= 0.0 {
            *value
        } else {
            0.0
        };
    }
    matrix
}

fn symmetrize_covariance(covariance: &mut EkfMatrix) {
    *covariance = (*covariance + covariance.transpose()) * 0.5;
}

fn state_vector_is_finite(state: &EkfVector) -> bool {
    state.iter().all(|value| value.is_finite())
}

fn meters_to_latitude_degrees(meters: f64) -> f64 {
    meters / METERS_PER_DEGREE_LATITUDE
}

fn meters_to_longitude_degrees(meters: f64, latitude: f64) -> f64 {
    meters / meters_per_longitude_degree(latitude)
}

fn meters_per_longitude_degree(latitude: f64) -> f64 {
    let latitude_cosine = latitude.to_radians().cos().abs().max(MIN_LONGITUDE_COSINE);
    METERS_PER_DEGREE_LATITUDE * latitude_cosine
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "actual={actual} expected={expected} tolerance={tolerance}"
        );
    }

    #[test]
    fn init_normalizes_heading_and_sets_floor() {
        let state = init_ekf(23.246, 77.502, 370.0, 2);
        assert!(state.is_some());
        let state = state.unwrap_or_else(|| EkfState::new(0.0, 0.0, 0.0, 0));

        assert_close(state.latitude(), 23.246, 0.000001);
        assert_close(state.longitude(), 77.502, 0.000001);
        assert_close(state.heading_degrees(), 10.0, 0.000001);
        assert_eq!(state.floor_index(), 2);
    }

    #[test]
    fn predict_with_north_step_increases_latitude_and_sets_velocity() {
        let mut state = EkfState::new(23.246, 77.502, 0.0, 0);
        let initial_latitude = state.latitude();

        ekf_predict(&mut state, 0.0, 1.0, 0.5);

        assert!(state.latitude() > initial_latitude);
        assert_close(state.longitude(), 77.502, 0.000001);
        assert_close(state.velocity_meters_per_second(), 2.0, 0.000001);
        assert_close(state.step_length_meters(), 1.0, 0.000001);
    }

    #[test]
    fn gps_update_moves_toward_fix() {
        let mut state = EkfState::new(23.246, 77.502, 0.0, 0);
        let before = state.latitude();

        ekf_update_gps(&mut state, 23.247, 77.503, 3.0);

        assert!(state.latitude() > before);
        assert!(state.latitude() < 23.247);
        assert!(state.longitude() > 77.502);
        assert!(state.longitude() < 77.503);
    }

    #[test]
    fn invalid_gps_update_does_not_modify_state() {
        let mut state = EkfState::new(23.246, 77.502, 0.0, 0);
        let before = state.clone();

        ekf_update_gps(&mut state, f64::NAN, 77.503, 3.0);

        assert_eq!(state.latitude(), before.latitude());
        assert_eq!(state.longitude(), before.longitude());
        assert_eq!(state.heading_degrees(), before.heading_degrees());
    }

    #[test]
    fn heading_update_uses_shortest_turn_across_zero() {
        let mut state = EkfState::new(23.246, 77.502, 350.0, 0);
        let before_delta = signed_delta_degrees(state.heading_degrees(), 10.0).abs();

        ekf_update_heading(&mut state, 10.0, 1.0);

        let after_delta = signed_delta_degrees(state.heading_degrees(), 10.0).abs();
        assert!(after_delta < before_delta);
        assert!(state.heading_degrees() >= 350.0 || state.heading_degrees() <= 10.0);
    }

    #[test]
    fn floor_update_moves_discrete_floor_estimate() {
        let mut state = EkfState::new(23.246, 77.502, 0.0, 0);

        ekf_update_floor(&mut state, 2);

        assert_eq!(state.floor_index(), 2);
    }

    #[test]
    fn confidence_position_update_ignores_zero_confidence() {
        let mut state = EkfState::new(23.246, 77.502, 0.0, 0);
        let before = state.clone();

        ekf_update_wifi_position(&mut state, 23.260, 77.520, 0.0);

        assert_eq!(state.latitude(), before.latitude());
        assert_eq!(state.longitude(), before.longitude());
    }

    #[test]
    fn synthetic_sequence_is_deterministic() {
        let mut a = EkfState::new(23.246, 77.502, 0.0, 0);
        let mut b = EkfState::new(23.246, 77.502, 0.0, 0);

        for state in [&mut a, &mut b] {
            ekf_predict(state, 90.0, 0.8, 0.8);
            ekf_update_heading(state, 88.0, 0.8);
            ekf_update_gps(state, 23.246, 77.50202, 8.0);
            ekf_update_wifi_position(state, 23.24601, 77.50203, 0.7);
            ekf_update_magnetic_position(state, 23.24602, 77.50204, 0.5);
            ekf_update_floor(state, 1);
        }

        assert_close(a.latitude(), b.latitude(), 0.0);
        assert_close(a.longitude(), b.longitude(), 0.0);
        assert_close(a.heading_degrees(), b.heading_degrees(), 0.0);
        assert_eq!(a.floor_index(), b.floor_index());
    }
}
