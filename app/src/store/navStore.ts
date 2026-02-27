// app/src/store/navStore.ts
// Central navigation state — wraps campus data, IDB, route cache
// This is the single source of truth for all navigation components

import { createSignal, createRoot } from 'solid-js'
import type { CampusMap, Node, CachedRoute, QRPayload } from '../../../shared/types'
import { buildGraph } from '../engine/graph'
import { precomputeAllRoutes, getRoute } from '../engine/dijkstra'
import { loadStartupData, saveMapData, saveRouteCache } from '../offline/idb'
import { searchIndex } from '../engine/searchIndex'
import campusDataRaw from '../data/oct_campus.json'

const campusData = campusDataRaw as unknown as CampusMap

// ─── State ────────────────────────────────────────────────────────────────────

function createNavStore() {
    const [currentNode, setCurrentNode] = createSignal<Node | null>(null)
    const [destination, setDestination] = createSignal<Node | null>(null)
    const [activeRoute, setActiveRoute] = createSignal<CachedRoute | null>(null)
    const [campusMap, setCampusMap] = createSignal<CampusMap | null>(null)
    const [routeCache, setRouteCache] = createSignal<Map<string, CachedRoute>>(new Map())
    const [nodeIndex, setNodeIndex] = createSignal<Map<string, Node>>(new Map())
    const [ready, setReady] = createSignal(false)

    // ─── Startup: batched IDB read → fallback to bundled JSON ────────────────

    async function init() {
        const { mapData, routeCache: cachedRoutes } = await loadStartupData('oct_bhopal_main')

        const map: CampusMap = mapData ?? campusData
        setCampusMap(map)

        // Build node lookup index + search index
        const idx = new Map<string, Node>()
        const allNodes: Node[] = []
        for (const building of map.buildings) {
            for (const floor of building.floors) {
                for (const node of floor.nodes) {
                    idx.set(node.id, node)
                    allNodes.push(node)
                }
            }
        }
        setNodeIndex(idx)
        searchIndex.build(allNodes)   // prefix trie — O(N·L) once at startup

        if (cachedRoutes.size > 0) {
            // Fast path — routes already precomputed
            setRouteCache(cachedRoutes)
        } else {
            // First install — precompute all routes and persist
            const allEdges = []
            for (const building of map.buildings)
                for (const floor of building.floors)
                    allEdges.push(...floor.edges)
            const graph = buildGraph(allNodes, allEdges)
            const nodeIds = allNodes.map(n => n.id)
            const routes = precomputeAllRoutes(graph, nodeIds)
            setRouteCache(routes)
            // Persist map + routes to IDB (non-blocking)
            saveMapData(map).catch(console.error)
            saveRouteCache(routes).catch(console.error)
        }

        setReady(true)
        console.info(`[navStore] ready — ${idx.size} nodes, ${routeCache().size} routes cached`)
    }

    // ─── QR scan handler ─────────────────────────────────────────────────────

    function onQRScanned(payload: QRPayload) {
        const node = nodeIndex().get(payload.node)
        if (!node) {
            console.warn('[navStore] unknown node from QR:', payload.node)
            return
        }
        setCurrentNode(node)

        // If destination is already chosen, recompute route from new position
        const dest = destination()
        if (dest) {
            const route = getRoute(routeCache(), node.id, dest.id)
            setActiveRoute(route)
        }
    }

    // ─── Destination selection ────────────────────────────────────────────────

    function setDestinationById(nodeId: string) {
        const node = nodeIndex().get(nodeId)
        if (!node) return
        setDestination(node)

        const current = currentNode()
        if (current) {
            const route = getRoute(routeCache(), current.id, nodeId)
            setActiveRoute(route)
        }
    }

    function clearNavigation() {
        setDestination(null)
        setActiveRoute(null)
    }

    return {
        // Signals
        currentNode,
        destination,
        activeRoute,
        campusMap,
        nodeIndex,
        ready,
        // Actions
        init,
        onQRScanned,
        setDestinationById,
        clearNavigation,
    }
}

// Singleton — created once outside component tree (§SolidJS best practice)
const navStore = createRoot(createNavStore)
export default navStore
