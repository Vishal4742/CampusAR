// app/src/utils/distance.ts
// Walking distance + ETA estimates

/** Euclidean distance between two SVG-coordinate nodes (meters) */
export function distancePx(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Human-readable distance string.
 * <10m → "here", <1000m → "45 m", else "1.2 km"
 */
export function formatDistance(meters: number): string {
    if (meters < 5) return 'You are here'
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Estimated walking time in seconds.
 * Average indoor walking speed ≈ 1.2 m/s
 */
export function walkingETA(meters: number, speedMps = 1.2): number {
    return Math.ceil(meters / speedMps)
}

/** Format seconds → "2 min", "45 sec" */
export function formatETA(seconds: number): string {
    if (seconds < 60) return `${seconds} sec`
    return `${Math.ceil(seconds / 60)} min`
}
