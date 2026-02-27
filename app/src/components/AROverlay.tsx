// app/src/components/AROverlay.tsx
// Camera feed + CSS 3D AR arrow layer (Week 4)
// §19.1: GPU compositing via will-change + translateZ(0). Only transform/opacity animated.

import { type Component, createMemo, Show, onMount, onCleanup } from 'solid-js'
import { sensorStore } from '../store/sensorStore'
import navStore from '../store/navStore'
import { calcAR } from '../engine/arCalc'
import { formatDistance, formatETA, walkingETA } from '../utils/distance'

interface Props {
    onBack: () => void
}

const AROverlay: Component<Props> = (props) => {
    let videoRef!: HTMLVideoElement
    let streamRef: MediaStream | null = null

    const { ekfState, status } = sensorStore
    const { destination, activeRoute, currentNode, nodeIndex } = navStore

    // Start camera on mount
    onMount(async () => {
        try {
            streamRef = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            videoRef.srcObject = streamRef
        } catch {
            // Camera unavailable — show map-only fallback (fine, sensor arrow still works)
        }
    })

    onCleanup(() => {
        streamRef?.getTracks().forEach(t => t.stop())
    })

    // Compute AR arrow data at 60fps via reactive signal (SolidJS fine-grained reactivity)
    const arData = createMemo(() => {
        const route = activeRoute()
        const dest = destination()
        const ekf = ekfState()

        if (!dest || !route || route.path.length < 2) return null

        // Look up the full Node for the next waypoint from the node index
        const nextNodeId = route.path[1] ?? route.path[0]
        const nextNode = nodeIndex().get(nextNodeId)
        if (!nextNode) return null

        return calcAR(ekf, nextNode, dest.floor ?? 0, currentNode()?.floor ?? 0)
    })

    const distanceText = createMemo(() => {
        const d = arData()?.distanceM ?? null
        if (d === null) return ''
        return `${formatDistance(d)} · ${formatETA(walkingETA(d))}`
    })

    return (
        <div class="ar-container">
            {/* ── Camera feed ────────────────────────────────────────────── */}
            <video
                ref={videoRef}
                class="ar-video"
                autoplay
                muted
                playsinline
                aria-hidden="true"
            />

            {/* ── CSS 3D AR layer (GPU-composited) ────────────────────────── */}
            <div class="ar-layer" aria-live="polite">

                {/* Arrow */}
                <Show when={arData() && !arData()!.arrived && status().permissionGranted && destination()}>
                    <div
                        class="ar-arrow-wrap"
                        style={{ transform: `translateZ(0) rotate(${arData()!.arrowDeg}deg)` }}
                    >
                        <div class="ar-arrow-shaft" />
                        <div class="ar-arrow-head" />
                    </div>
                </Show>

                {/* Arrived pulse */}
                <Show when={arData()?.arrived}>
                    <div class="ar-arrived-ring" aria-label="You have arrived" />
                </Show>

                {/* Floor change indicator */}
                <Show when={(arData()?.floorDelta ?? 0) !== 0}>
                    <div class="ar-floor-badge">
                        {(arData()?.floorDelta ?? 0) > 0 ? '↑ Go up' : '↓ Go down'}{' '}
                        {Math.abs(arData()?.floorDelta ?? 0)} floor{Math.abs(arData()?.floorDelta ?? 0) > 1 ? 's' : ''}
                    </div>
                </Show>

                {/* HUD — destination label + distance */}
                <Show when={destination()}>
                    <div class="ar-hud">
                        <span class="ar-hud-dest">{destination()!.shortLabel ?? destination()!.label}</span>
                        <span class="ar-hud-dist">{distanceText()}</span>
                    </div>
                </Show>

                {/* No destination state */}
                <Show when={!destination()}>
                    <div class="ar-hint">Scan a QR code to start navigation</div>
                </Show>

                {/* Degraded sensor warning */}
                <Show when={status().degraded}>
                    <div class="ar-warn">⚠ Compass unavailable</div>
                </Show>
            </div>

            {/* Back button */}
            <button class="ar-back" onClick={props.onBack} aria-label="Back">←</button>
        </div>
    )
}

export default AROverlay
