// app/src/screens/Navigate.tsx
// AR Navigation screen — shows sensor-driven EKF position + heading (Week 3)
// AR overlay arrow and route are built in Week 4

import { type Component, Show, createMemo } from 'solid-js'
import { sensorStore } from '../store/sensorStore'
import navStore from '../store/navStore'
import SensorGate from '../components/SensorGate'
import { getBearing, angleDiff } from '../utils/bearing'
import { formatDistance, formatETA, walkingETA } from '../utils/distance'

const NavigateScreen: Component<{ onBack: () => void }> = (props) => {
    const { status, ekfState, stepCount } = sensorStore
    const { currentNode, destination, activeRoute } = navStore

    // Bearing from estimated position to next waypoint in the route
    const nextBearing = createMemo(() => {
        const route = activeRoute()
        const state = ekfState()
        const dest = destination()
        if (!route || route.path.length < 2 || !dest) return null
        // Use raw SVG coords for bearing — Week 4 will snap to route
        return getBearing(state.x, state.y, dest.x, dest.y)
    })

    const compassHeadingDeg = createMemo(() =>
        ekfState().heading * (180 / Math.PI)
    )

    // Arrow rotation = bearing − device heading
    const arrowRotation = createMemo(() => {
        const nb = nextBearing()
        if (nb === null) return 0
        return angleDiff(nb, compassHeadingDeg())
    })

    const remainingDistance = createMemo(() => activeRoute()?.distance ?? null)

    return (
        <div class="screen-navigate">
            {/* iOS sensor permission gate */}
            <SensorGate />

            {/* Header */}
            <div class="nav-header">
                <button class="btn-back" onClick={props.onBack}>← Back</button>
                <Show when={destination()} fallback={
                    <p class="nav-hint">Scan a QR code or search for a destination</p>
                }>
                    <div class="nav-destination">
                        <span class="nav-dest-label">↗ {destination()!.label}</span>
                        <Show when={remainingDistance() !== null}>
                            <span class="nav-dist">
                                {formatDistance(remainingDistance()!)} ·{' '}
                                {formatETA(walkingETA(remainingDistance()!))}
                            </span>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* AR Arrow (Week 4 will swap this for the full CSS 3D overlay) */}
            <Show when={destination() && status().permissionGranted}>
                <div class="ar-placeholder">
                    <div
                        class="ar-arrow"
                        style={{ transform: `rotate(${arrowRotation()}deg)` }}
                    >
                        ↑
                    </div>
                    <p class="ar-label">
                        {destination()?.shortLabel ?? destination()?.label}
                    </p>
                    <Show when={status().degraded}>
                        <p class="ar-degraded">⚠ Compass unavailable — heading estimated</p>
                    </Show>
                </div>
            </Show>

            {/* Debug info (removed in production) */}
            <Show when={import.meta.env.DEV}>
                <div class="nav-debug">
                    <p>🦶 Steps: {stepCount()}</p>
                    <p>📍 x={ekfState().x.toFixed(1)} y={ekfState().y.toFixed(1)}</p>
                    <p>🧭 {compassHeadingDeg().toFixed(0)}°</p>
                    <p>📌 From: {currentNode()?.label ?? '—'}</p>
                    <p>🎯 To: {destination()?.label ?? '—'}</p>
                </div>
            </Show>
        </div>
    )
}

export default NavigateScreen
