// app/src/engine/arCalc.ts
// Bearing + heading → arrow angle for the AR overlay (§19.1)
// Pure computation — no signals, no side-effects

import { getBearing, angleDiff } from '../utils/bearing'
import type { EKFState } from './ekf'
import type { Node } from '../../../shared/types'

export interface ARCalcResult {
    /** Rotation angle for the CSS arrow (degrees, CSS rotateZ) */
    arrowDeg: number
    /** Distance to next waypoint in meters */
    distanceM: number
    /** True when user is within DESTINATION_RADIUS_M of the destination */
    arrived: boolean
    /** Floor change needed: +1 go up, -1 go down, 0 same floor */
    floorDelta: number
}

const DESTINATION_RADIUS_M = 5

/**
 * Corridor constraint filter (§17.3.2)
 * Snaps the EKF (x,y) estimate onto the nearest path segment so the dot
 * never drifts into a wall. Returns the constrained point.
 */
export function constrainToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): { x: number; y: number } {
    const dx = bx - ax, dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return { x: ax, y: ay }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
    return { x: ax + t * dx, y: ay + t * dy }
}

/**
 * Calculate AR arrow angle + metadata.
 *
 * @param ekf       Current EKF state (position + heading in SVG coords)
 * @param nextNode  Next waypoint along the route
 * @param destFloor Floor index of the final destination
 */
export function calcAR(
    ekf: EKFState,
    nextNode: Node,
    destFloor: number,
    currentFloor: number
): ARCalcResult {
    const bearing = getBearing(ekf.x, ekf.y, nextNode.x, nextNode.y)
    const headingDeg = ekf.heading * (180 / Math.PI)
    const arrowDeg = angleDiff(bearing, headingDeg)

    const dx = nextNode.x - ekf.x
    const dy = nextNode.y - ekf.y
    const distanceM = Math.sqrt(dx * dx + dy * dy)

    const arrived = distanceM < DESTINATION_RADIUS_M
    const floorDelta = destFloor - currentFloor

    return { arrowDeg, distanceM, arrived, floorDelta }
}
