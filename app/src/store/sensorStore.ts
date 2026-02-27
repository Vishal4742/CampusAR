// app/src/store/sensorStore.ts
// DeviceMotion (step detection) + DeviceOrientation (compass) → EKF updates
// §19.9: 30Hz orientation, 50Hz motion, { passive: true }, rAF frame budget

import { createSignal, createRoot } from 'solid-js'
import {
    SENSOR_HZ_ORIENTATION,
    SENSOR_HZ_MOTION,
    STEP_THRESHOLD,
} from '../../../shared/constants'
import {
    type EKFState,
    ekfPredict,
    ekfUpdateCompass,
    ekfUpdateQR,
    estimateStepLength,
} from '../engine/ekf'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorStatus {
    motionAvailable: boolean
    orientationAvailable: boolean
    permissionGranted: boolean
    degraded: boolean          // true when gyroscope unavailable
    error: string | null
}

const ZERO_STATE: EKFState = {
    x: 0, y: 0, heading: 0,
    cov: [[9999, 0, 0], [0, 9999, 0], [0, 0, 9999]],  // high uncertainty until QR fix
}

// ─── Store ────────────────────────────────────────────────────────────────────

function createSensorStore() {
    const [status, setStatus] = createSignal<SensorStatus>({
        motionAvailable: false,
        orientationAvailable: false,
        permissionGranted: false,
        degraded: false,
        error: null,
    })
    const [ekfState, setEkfState] = createSignal<EKFState>(ZERO_STATE)
    const [stepCount, setStepCount] = createSignal(0)

    // ── Throttle timestamps ──────────────────────────────────────────────────
    const orIntervalMs = 1000 / SENSOR_HZ_ORIENTATION   //  33ms
    const motIntervalMs = 1000 / SENSOR_HZ_MOTION         //  20ms
    let lastOr = 0
    let lastMot = 0

    // ── Weinberg tracking ────────────────────────────────────────────────────
    let aMin = 9.81, aMax = 9.81
    let inPeak = false
    let lastStep = 0

    // ── rAF loop (frame-budget sensor writes §19.3) ──────────────────────────
    // Sensor events only write to a staging variable; the rAF loop flushes to
    // signals once per frame so we never block layout.
    let pendingOrUpdate: (() => void) | null = null
    let pendingMotUpdate: (() => void) | null = null
    let rafId = 0

    function rafLoop() {
        pendingOrUpdate?.()
        pendingOrUpdate = null
        pendingMotUpdate?.()
        pendingMotUpdate = null
        rafId = requestAnimationFrame(rafLoop)
    }

    // ── Device Orientation handler (30 Hz compass) ───────────────────────────
    function handleOrientation(e: DeviceOrientationEvent) {
        const now = performance.now()
        if (now - lastOr < orIntervalMs) return
        lastOr = now

        // Prefer iOS webkitCompassHeading; fall back to W3C absolute alpha
        let headingDeg: number
        const win = e as any
        if (typeof win.webkitCompassHeading === 'number') {
            headingDeg = win.webkitCompassHeading
        } else if (e.absolute && e.alpha !== null) {
            headingDeg = (360 - e.alpha) % 360
        } else {
            // Relative mode — degraded; don't update heading
            setStatus(s => ({ ...s, degraded: true }))
            return
        }

        const headingRad = headingDeg * (Math.PI / 180)
        pendingOrUpdate = () =>
            setEkfState(prev => ekfUpdateCompass(prev, headingRad))
    }

    // ── Device Motion handler (50 Hz step detection) ─────────────────────────
    function handleMotion(e: DeviceMotionEvent) {
        const now = performance.now()
        if (now - lastMot < motIntervalMs) return
        lastMot = now

        const acc = e.accelerationIncludingGravity
        if (!acc || acc.x === null) return
        const mag = Math.sqrt(acc.x! ** 2 + acc.y! ** 2 + acc.z! ** 2)

        if (mag > aMax) aMax = mag
        if (mag < aMin) aMin = mag

        // Peak detector — debounce 300ms between steps
        if (mag > STEP_THRESHOLD && !inPeak && now - lastStep > 300) {
            inPeak = true
            lastStep = now
            const L = estimateStepLength(aMax, aMin)
            aMin = aMax = 9.81            // reset window for next step

            pendingMotUpdate = () => {
                setStepCount(c => c + 1)
                setEkfState(prev => ekfPredict(prev, L))
            }
        } else if (mag < STEP_THRESHOLD - 1.0) {
            inPeak = false
        }
    }

    // ── iOS permission gate (§13 risk) ───────────────────────────────────────
    async function requestPermissions(): Promise<boolean> {
        try {
            // iOS 13+ requires explicit user gesture to unlock motion/orientation
            const DOE = DeviceOrientationEvent as any
            if (typeof DOE.requestPermission === 'function') {
                const res = await DOE.requestPermission()
                if (res !== 'granted') throw new Error('DeviceOrientation permission denied')
            }
            const DME = DeviceMotionEvent as any
            if (typeof DME.requestPermission === 'function') {
                const res = await DME.requestPermission()
                if (res !== 'granted') throw new Error('DeviceMotion permission denied')
            }

            const motAvail = 'DeviceMotionEvent' in window
            const orAvail = 'DeviceOrientationEvent' in window

            window.addEventListener('deviceorientation', handleOrientation, { passive: true })
            window.addEventListener('devicemotion', handleMotion, { passive: true })

            // Graceful degradation: if gyroscope unavailable mark as degraded
            const degraded = !orAvail || !motAvail
            setStatus({
                motionAvailable: motAvail,
                orientationAvailable: orAvail,
                permissionGranted: true,
                degraded,
                error: null,
            })

            rafId = requestAnimationFrame(rafLoop)
            return true
        } catch (err: any) {
            setStatus(s => ({
                ...s,
                permissionGranted: false,
                error: err?.message ?? 'Sensor access denied',
            }))
            return false
        }
    }

    function stopSensors() {
        window.removeEventListener('deviceorientation', handleOrientation)
        window.removeEventListener('devicemotion', handleMotion)
        cancelAnimationFrame(rafId)
    }

    // ── QR fix (called by navStore after every scan) ─────────────────────────
    function resetPositionQR(x: number, y: number, headingRad: number) {
        setEkfState(ekfUpdateQR(ZERO_STATE, x, y, headingRad))
    }

    return {
        status,
        ekfState,
        stepCount,
        requestPermissions,
        stopSensors,
        resetPositionQR,
    }
}

export const sensorStore = createRoot(createSensorStore)
