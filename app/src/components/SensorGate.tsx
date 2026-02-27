// app/src/components/SensorGate.tsx
// iOS 13+ requires a user gesture to unlock DeviceMotion + DeviceOrientation.
// On Android/desktop the button is hidden and sensors start automatically (§13 risk).

import { type Component, createSignal, Show, onMount } from 'solid-js'
import { sensorStore } from '../store/sensorStore'

interface Props {
    onGranted?: () => void
}

const SensorGate: Component<Props> = (props) => {
    const { status, requestPermissions } = sensorStore
    const [requesting, setRequesting] = createSignal(false)

    // On non-iOS browsers auto-start sensors without a gesture
    onMount(async () => {
        const needsGesture =
            typeof (DeviceOrientationEvent as any).requestPermission === 'function'
        if (!needsGesture) {
            await requestPermissions()
            props.onGranted?.()
        }
    })

    async function handleTap() {
        setRequesting(true)
        const granted = await requestPermissions()
        setRequesting(false)
        if (granted) props.onGranted?.()
    }

    return (
        <Show when={!status().permissionGranted && !status().error}>
            <div class="sensor-gate">
                <div class="sensor-gate__card">
                    <div class="sensor-gate__icon">📡</div>
                    <h2>Enable AR Navigation</h2>
                    <p>
                        CampusAR needs access to your device's motion and compass sensors
                        to show the AR directional arrow.
                    </p>
                    <button
                        class="sensor-gate__btn"
                        onClick={handleTap}
                        disabled={requesting()}
                    >
                        {requesting() ? 'Enabling…' : 'Tap to enable AR'}
                    </button>
                    <Show when={status().error}>
                        <p class="sensor-gate__error">{status().error}</p>
                    </Show>
                </div>
            </div>
        </Show>
    )
}

export default SensorGate
