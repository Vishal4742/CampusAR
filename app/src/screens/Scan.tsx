// app/src/screens/Scan.tsx
// The default screen — camera view with QR scanner overlay
// This is the EAGER-loaded screen (not lazy) — it's what the user sees first

import { createSignal, Show } from 'solid-js'
import { QRScanner } from '../components/QRScanner'
import type { QRPayload } from '../../../shared/types'

interface ScanScreenProps {
    onScanned: (payload: QRPayload) => void
}

export default function ScanScreen(props: ScanScreenProps) {
    const [error, setError] = createSignal<string | null>(null)
    const [lastScan, setLastScan] = createSignal<string | null>(null)

    function handleScan(payload: QRPayload) {
        setLastScan(`📍 ${payload.label} — Floor ${payload.floor}`)
        setError(null)
        props.onScanned(payload)
    }

    return (
        <div class="scan-screen">
            <QRScanner onScan={handleScan} onError={setError} />

            {/* Scan reticle overlay */}
            <div class="scan-ui" aria-live="polite">
                <div class="scan-frame" aria-label="Point camera at QR code" />

                <Show when={lastScan()}>
                    <div class="scan-success" role="status">
                        {lastScan()}
                    </div>
                </Show>

                <Show when={error()}>
                    <div class="scan-error" role="alert">
                        {error()}
                    </div>
                </Show>

                <p class="scan-hint">Point camera at a QR code on the wall</p>
            </div>
        </div>
    )
}
