// app/src/components/QRScanner.tsx
// Camera feed + QR detection — §9.1, §19.2, §19.4
// - Explicit getUserMedia constraints for lowest-latency capture
// - Zero-copy Transferable ImageBitmap to WebWorker
// - Center-crops 320×320 from the full 1280×720 frame

import { onCleanup, onMount, createSignal } from 'solid-js'
import { parseQRPayload } from '../engine/qrParser'
import type { QRPayload } from '../../../shared/types'
import { QR_CROP_SIZE } from '../../../shared/constants'
// Vite ?worker — bundled as a Web Worker chunk automatically
import QRWorker from '../workers/qrWorker?worker'

interface QRScannerProps {
    onScan: (payload: QRPayload) => void
    onError?: (msg: string) => void
}

export function QRScanner(props: QRScannerProps) {
    let videoRef!: HTMLVideoElement
    let rafId = 0
    const [scanning, setScanning] = createSignal(true)

    // WebWorker — Nimiq runs off main thread. QRWorker is a Vite ?worker import.
    const worker = new QRWorker()

    worker.onmessage = (e: MessageEvent) => {
        if (e.data.type !== 'QR_FOUND') return
        const result = parseQRPayload(e.data.data)
        if (!result.ok) return
        navigator.vibrate?.(80) // haptic feedback on successful scan
        props.onScan(result.payload)
    }

    async function startCamera() {
        try {
            // §19.2 — explicit constraints for lowest-latency capture
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 },
                    // @ts-expect-error — not in all TS lib versions yet
                    focusMode: 'continuous',
                    exposureMode: 'continuous',
                    whiteBalanceMode: 'continuous',
                    resizeMode: 'none',
                },
                audio: false,
            })
            videoRef.srcObject = stream
            await videoRef.play()
            scheduleFrameScan()
        } catch (err) {
            props.onError?.(`Camera error: ${err}`)
        }
    }

    function scheduleFrameScan() {
        rafId = requestAnimationFrame(async () => {
            if (!scanning()) return

            const video = videoRef
            if (video.readyState < video.HAVE_ENOUGH_DATA) {
                scheduleFrameScan()
                return
            }

            // §19.4 — center-crop using OffscreenCanvas, send as Transferable
            const vw = video.videoWidth
            const vh = video.videoHeight
            const sx = (vw - QR_CROP_SIZE) / 2
            const sy = (vh - QR_CROP_SIZE) / 2

            const oc = new OffscreenCanvas(QR_CROP_SIZE, QR_CROP_SIZE)
            const ctx = oc.getContext('2d')!
            ctx.drawImage(video, sx, sy, QR_CROP_SIZE, QR_CROP_SIZE, 0, 0, QR_CROP_SIZE, QR_CROP_SIZE)

            const bitmap = await createImageBitmap(oc)
            // Transfer ownership — zero memory copy
            worker.postMessage({ type: 'SCAN_FRAME', bitmap }, [bitmap])

            scheduleFrameScan()
        })
    }

    onMount(() => { startCamera() })

    onCleanup(() => {
        cancelAnimationFrame(rafId)
        setScanning(false)
        worker.terminate()
        const stream = videoRef?.srcObject as MediaStream | null
        stream?.getTracks().forEach(t => t.stop())
    })

    return (
        <div class="qr-scanner">
            <video
                ref={videoRef}
                playsinline
                muted
                class="camera-feed"
                aria-label="Camera feed for QR scanning"
            />
            <div class="scan-reticle" aria-hidden="true" />
        </div>
    )
}
