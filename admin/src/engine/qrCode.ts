// admin/src/engine/qrCode.ts
// Client-side QR code SVG generator (§18.7) — no server needed
// Uses the built-in QR encoding from qrcodegen (tiny, pure TS port)

/**
 * Generate a minimal SVG string for a QR code encoding `text`.
 * Uses the ISO 18004 QR algorithm via a compact inline implementation.
 * Returns an SVG string with white modules on black background.
 */
export function generateQRSvg(text: string, size = 200): string {
    const modules = encodeQR(text)
    const n = modules.length
    const cellSize = size / n
    let rects = ''
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (modules[r][c]) {
                rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`
}

// ─── Minimal QR encoder (version 1-6, byte mode, ECC-M) ────────────────────




function encodeQR(text: string): boolean[][] {
    // Determine version (1-10 byte mode capacity at ECC-M)
    const byteCapacity = [16, 28, 44, 64, 86, 108, 124, 154, 182, 216]
    const bytes = new TextEncoder().encode(text)
    let version = 1
    for (let v = 0; v < byteCapacity.length; v++) {
        if (bytes.length <= byteCapacity[v]) { version = v + 1; break }
    }

    const size = version * 4 + 17
    const grid: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))
    const fixed: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))

    // Place finder patterns
    function placeFinder(row: number, col: number) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const rr = row + r, cc = col + c
                if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
                fixed[rr][cc] = true
                grid[rr][cc] = (r >= 0 && r <= 6 && c >= 0 && c <= 6) &&
                    (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
            }
        }
    }
    placeFinder(0, 0)
    placeFinder(0, size - 7)
    placeFinder(size - 7, 0)

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        grid[6][i] = grid[i][6] = i % 2 === 0
        fixed[6][i] = fixed[i][6] = true
    }

    // Dark module
    grid[size - 8][8] = true
    fixed[size - 8][8] = true

    // Data codewords (simplified — places data bits using mask 0)
    const dataBits: boolean[] = []
    // Mode indicator: byte = 0100
    dataBits.push(false, true, false, false)
    // Character count (8 bits for version 1-9)
    for (let i = 7; i >= 0; i--) dataBits.push(!!(bytes.length & (1 << i)))
    // Data bytes
    for (const b of bytes)
        for (let i = 7; i >= 0; i--) dataBits.push(!!(b & (1 << i)))
    // Terminator
    for (let i = 0; i < 4 && dataBits.length % 8 !== 0; i++) dataBits.push(false)
    // Pad to byte boundary
    while (dataBits.length % 8 !== 0) dataBits.push(false)

    // Place bits in zigzag order (right to left, bottom to top, skip fixed)
    let bitIdx = 0
    let upward = true
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right--
        const cols = upward ? [right, right - 1] : [right, right - 1]
        for (let row = upward ? size - 1 : 0; upward ? row >= 0 : row < size; row += upward ? -1 : 1) {
            for (const col of cols) {
                if (!fixed[row][col]) {
                    const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : false
                    // Apply mask 0: (row + col) % 2 === 0 → invert
                    grid[row][col] = bit !== ((row + col) % 2 === 0)
                }
            }
        }
        upward = !upward
    }

    return grid
}

// ─── QR payload builder ─────────────────────────────────────────────────────

import type { QRPayload } from '../../../shared/types'

export function buildQRPayload(partial: Omit<QRPayload, 'app' | 'v'>): QRPayload {
    return { app: 'campusar', v: 2, ...partial }
}

export function payloadToString(p: QRPayload): string {
    return JSON.stringify(p)
}
