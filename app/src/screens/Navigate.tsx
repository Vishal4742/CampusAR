// app/src/screens/Navigate.tsx
// AR Navigation screen — mounts AROverlay (Week 4: camera + CSS 3D arrow)

import { type Component } from 'solid-js'
import '../styles/ar.css'
import AROverlay from '../components/AROverlay'
import SensorGate from '../components/SensorGate'
import { sensorStore } from '../store/sensorStore'
import { Show } from 'solid-js'

const NavigateScreen: Component<{ onBack: () => void }> = (props) => {
    const { status } = sensorStore

    return (
        <>
            {/* iOS permission gate — auto-hides once granted */}
            <Show when={!status().permissionGranted}>
                <SensorGate onGranted={() => {/* AROverlay starts reactively once status() flips */ }} />
            </Show>

            {/* Full-screen AR view — renders once sensors granted */}
            <Show when={status().permissionGranted} fallback={
                // While waiting for iOS permission show a plain "requesting" screen
                <div class="screen-navigate screen-navigate--waiting">
                    <button class="btn-back" onClick={props.onBack}>← Back</button>
                </div>
            }>
                <AROverlay onBack={props.onBack} />
            </Show>
        </>
    )
}

export default NavigateScreen
