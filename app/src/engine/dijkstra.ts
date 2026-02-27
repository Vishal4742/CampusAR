// app/src/engine/dijkstra.ts
// Multi-floor shortest-path via Dijkstra — §11 Week 2 (§19.5.2)
// Only used at install/sync time — never called live during navigation

import type { AdjacencyList } from './graph'
import type { CachedRoute } from '../../../shared/types'

const INF = Number.MAX_SAFE_INTEGER

/**
 * Compute shortest path from `start` to `end` in the adjacency list.
 * Returns null if no path exists.
 */
export function dijkstra(
    graph: AdjacencyList,
    start: string,
    end: string,
): CachedRoute | null {
    if (start === end) {
        return { path: [start], distance: 0, floors: [] }
    }

    const dist = new Map<string, number>()
    const prev = new Map<string, string | null>()
    // Min-heap via sorted array — small enough for campus-scale graphs (≤500 nodes)
    const queue: Array<[cost: number, nodeId: string]> = []

    for (const id of graph.keys()) {
        dist.set(id, INF)
        prev.set(id, null)
    }
    dist.set(start, 0)
    queue.push([0, start])

    while (queue.length > 0) {
        // Pop the lowest-cost node
        queue.sort((a, b) => a[0] - b[0])
        const [cost, u] = queue.shift()!

        if (u === end) break
        if (cost > (dist.get(u) ?? INF)) continue  // stale entry

        const neighbours = graph.get(u) ?? []
        for (const { to, weight } of neighbours) {
            const alt = (dist.get(u) ?? INF) + weight
            if (alt < (dist.get(to) ?? INF)) {
                dist.set(to, alt)
                prev.set(to, u)
                queue.push([alt, to])
            }
        }
    }

    const totalDist = dist.get(end) ?? INF
    if (totalDist === INF) return null  // unreachable

    // Reconstruct path
    const path: string[] = []
    let cur: string | null = end
    while (cur !== null) {
        path.unshift(cur)
        cur = prev.get(cur) ?? null
    }

    return { path, distance: totalDist, floors: [] }
}

/**
 * Precompute all O(n²) routes and store in a flat Map.
 * Key format: "FROM::TO" — O(1) lookup at runtime (§19.5.2)
 * 
 * For 30 nodes → 870 pairs → runs in <100ms at install time.
 * Result is persisted to IndexedDB.
 */
export function precomputeAllRoutes(
    graph: AdjacencyList,
    nodeIds: string[],
): Map<string, CachedRoute> {
    const cache = new Map<string, CachedRoute>()

    for (const from of nodeIds) {
        for (const to of nodeIds) {
            if (from === to) continue
            const route = dijkstra(graph, from, to)
            if (route) {
                cache.set(`${from}::${to}`, route)
            }
        }
    }

    return cache
}

/**
 * Runtime O(1) route lookup (§19.5.2).
 * Call this during live navigation — never call dijkstra() directly.
 */
export function getRoute(
    cache: Map<string, CachedRoute>,
    from: string,
    to: string,
): CachedRoute | null {
    return cache.get(`${from}::${to}`) ?? null
}
