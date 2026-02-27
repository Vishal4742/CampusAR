// app/src/engine/ekf.ts
// Extended Kalman Filter — position + heading fusion (§17.2)
// State: [x, y, heading]  (meters in floor SVG space; 0=North, π/2=East)

import {
    WEINBERG_K,
    EKF_Q_POSITION,
    EKF_Q_HEADING,
    EKF_R_MAG,
} from '../../../shared/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EKFState {
    x: number          // meters, SVG x-axis
    y: number          // meters, SVG y-axis
    heading: number    // radians: 0=North (+Y), π/2=East (+X)
    cov: Cov3x3        // 3×3 covariance matrix
}

type Cov3x3 = [[number, number, number], [number, number, number], [number, number, number]]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap angle to (−π, π] */
function wrapAngle(a: number): number {
    return Math.atan2(Math.sin(a), Math.cos(a))
}

/** 3×3 matrix multiply */
function mat3mul(A: Cov3x3, B: Cov3x3): Cov3x3 {
    const C: Cov3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++)
                C[i][j] += A[i][k] * B[k][j]
    return C
}

/** 3×3 transpose */
function mat3T(A: Cov3x3): Cov3x3 {
    return [
        [A[0][0], A[1][0], A[2][0]],
        [A[0][1], A[1][1], A[2][1]],
        [A[0][2], A[1][2], A[2][2]],
    ]
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise EKF at a known location (called immediately after QR scan).
 * Very low initial covariance — we trust the QR fix (§EKF_R_QR ≈ 0).
 */
export function initEKF(x: number, y: number, headingRad: number): EKFState {
    return {
        x,
        y,
        heading: headingRad,
        cov: [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 0.05]],
    }
}

/**
 * Weinberg Adaptive Step Length (§17.2.3)
 * L = K × ⁴√(a_max − a_min)
 */
export function estimateStepLength(aMax: number, aMin: number): number {
    if (aMax <= aMin) return 0.65  // safe constant fallback
    return WEINBERG_K * Math.pow(aMax - aMin, 0.25)
}

/**
 * Predict: update state after one detected step of length L at current heading.
 * Called in the motion sensor handler every time a footstep peak is detected.
 */
export function ekfPredict(state: EKFState, stepLen: number): EKFState {
    const { x, y, heading: h, cov: P } = state

    // Motion model
    const nx = x + stepLen * Math.sin(h)
    const ny = y + stepLen * Math.cos(h)

    // Jacobian F  (∂f/∂state)
    const F: Cov3x3 = [
        [1, 0, stepLen * Math.cos(h)],
        [0, 1, -stepLen * Math.sin(h)],
        [0, 0, 1],
    ]

    // Process noise Q
    const Q: Cov3x3 = [
        [EKF_Q_POSITION, 0, 0],
        [0, EKF_Q_POSITION, 0],
        [0, 0, EKF_Q_HEADING],
    ]

    // P = F P Fᵀ + Q
    const nP = mat3mul(mat3mul(F, P), mat3T(F))
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            nP[i][j] += Q[i][j]

    return { x: nx, y: ny, heading: h, cov: nP as Cov3x3 }
}

/**
 * Compass update: incorporate magnetometer heading measurement.
 * H = [0, 0, 1]  (we only observe the heading)
 */
export function ekfUpdateCompass(state: EKFState, measuredRad: number): EKFState {
    const { x, y, heading: h, cov: P } = state

    const innovation = wrapAngle(measuredRad - h)
    const S = P[2][2] + EKF_R_MAG          // scalar: H P Hᵀ + R

    // Kalman gain  K = P Hᵀ / S  →  [K0, K1, K2]
    const K = [P[0][2] / S, P[1][2] / S, P[2][2] / S]

    const nx = x + K[0] * innovation
    const ny = y + K[1] * innovation
    const nHeading = wrapAngle(h + K[2] * innovation)

    // P = (I − K H) P
    const nP: Cov3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            nP[i][j] = P[i][j] - K[i] * P[2][j]

    return { x: nx, y: ny, heading: nHeading, cov: nP }
}

/**
 * QR fix: called when a new QR code is scanned.
 * Resets position to near-certainty.
 */
export function ekfUpdateQR(
    _state: EKFState,
    qrX: number,
    qrY: number,
    qrHeadingRad: number
): EKFState {
    return initEKF(qrX, qrY, qrHeadingRad)
}
