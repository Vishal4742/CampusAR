// app/src/workers/qrWorker.ts
// QR detection running off the main thread — §9.1, §19.4
// Receives Transferable ImageBitmap, outputs QR string via postMessage

// Use jsQR — a pure browser-compatible QR library (no Node.js deps)
// Loaded dynamically so the worker compiles without Node.js polyfills
let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null

async function getJsQR() {
    if (!jsQR) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import('jsqr') as any
        jsQR = mod.default ?? mod
    }
    return jsQR!
}

self.onmessage = async (e: MessageEvent<{ type: string; bitmap: ImageBitmap }>) => {
    if (e.data.type !== 'SCAN_FRAME') return

    const { bitmap } = e.data
    const w = bitmap.width
    const h = bitmap.height

    try {
        const scan = await getJsQR()
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close() // release GPU memory (§19.4)

        const imageData = ctx.getImageData(0, 0, w, h)
        const result = scan(imageData.data, w, h)

        if (result) {
            self.postMessage({ type: 'QR_FOUND', data: result.data })
        }
    } catch {
        try { e.data.bitmap.close() } catch { /* already closed */ }
    }
}
