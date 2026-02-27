// app/src/utils/bearing.ts
// Compass bearing and angle helpers for AR arrow calculation

/**
 * Returns compass bearing (0–360°) from (x1,y1) → (x2,y2)
 * SVG coords: x right, y down.  0° = North = moving up (decreasing y).
 */
export function getBearing(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1   // positive = South in SVG
    // atan2(dy, dx) gives angle from East; we want from North
    const rad = Math.atan2(dx, -dy)
    let deg = rad * (180 / Math.PI)
    if (deg < 0) deg += 360
    return deg  // 0 = North, 90 = East, 180 = South, 270 = West
}

/** Normalise any angle to [0, 360) */
export function normDeg(deg: number): number {
    return ((deg % 360) + 360) % 360
}

/**
 * Shortest signed difference (target − current) in the range [−180, 180].
 * Use this to determine which way to rotate an arrow.
 */
export function angleDiff(target: number, current: number): number {
    let d = ((target - current) % 360 + 360) % 360
    if (d > 180) d -= 360
    return d
}
