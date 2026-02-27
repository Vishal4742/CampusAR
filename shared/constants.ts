// shared/constants.ts — CampusAR global constants

export const APP_ID = 'campusar'
export const QR_VERSION = 2

// Campus grid
export const GRID_SIZE = 1000  // SVG coordinate space (0–1000)
export const MAX_FLOORS = 5
export const MAX_NODES = 500

// Navigation thresholds
export const DESTINATION_RADIUS_M = 5    // meters — destination reached
export const DRIFT_WARN_RADIUS_M = 15   // meters — warn user to rescan
export const QR_MAX_DISTANCE_M = 30   // meters — max spacing between QR codes

// Performance (§19)
export const SENSOR_HZ_ORIENTATION = 30   // Hz — throttle DeviceOrientation
export const SENSOR_HZ_MOTION = 50   // Hz — throttle DeviceMotion
export const QR_CROP_SIZE = 320  // px — center crop for QR decoding
export const STEP_THRESHOLD = 12   // m/s² — peak to count as a step (§9.4)

// EKF tuning (§17.2)
export const EKF_Q_POSITION = 0.1   // process noise — position per step
export const EKF_Q_HEADING = 0.05  // process noise — heading per step
export const EKF_R_MAG = 0.15  // measurement noise — magnetometer (rad)
export const EKF_R_QR = 0.001 // measurement noise — QR scan (near-zero)
export const WEINBERG_K = 0.42  // step length tuning constant

// Network (§18.3)
export const SYNC_TIMEOUT_4G = 3000  // ms
export const SYNC_TIMEOUT_3G = 5000
export const SYNC_TIMEOUT_2G = 10000
export const SYNC_TIMEOUT_SLOW = 15000

// IDB
export const IDB_NAME = 'campusar_db'
export const IDB_VERSION = 1
