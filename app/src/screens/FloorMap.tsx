// app/src/screens/FloorMap.tsx
// 2D SVG floor map with active route polyline + accuracy ring (§17.4)
// Taps a node to set as destination

import { type Component, createSignal, createMemo, For, Show } from 'solid-js'
import navStore from '../store/navStore'
import { sensorStore } from '../store/sensorStore'
import AccuracyRing from '../components/AccuracyRing'
import FloorBadge from '../components/FloorBadge'
import RouteCard from '../components/RouteCard'
import type { Node } from '../../../shared/types'

const SVG_SIZE = 1000   // coordinate space
const PX_SIZE = 320    // rendered px (scales via CSS)
const PX_PER_M = PX_SIZE / SVG_SIZE  // for AccuracyRing

const FloorMapScreen: Component = () => {
    const { campusMap, activeRoute, nodeIndex, currentNode, destination, setDestinationById } = navStore
    const { ekfState } = sensorStore

    // Derive max floor from map
    const maxFloor = createMemo(() => {
        const map = campusMap()
        if (!map) return 0
        let max = 0
        for (const b of map.buildings)
            for (const f of b.floors)
                if (f.number > max) max = f.number
        return max
    })

    const [selectedFloor, setSelectedFloor] = createSignal(0)
    const [showRouteCard, setShowRouteCard] = createSignal(false)

    // Nodes on selected floor
    const floorNodes = createMemo((): Node[] => {
        const map = campusMap()
        if (!map) return []
        const nodes: Node[] = []
        for (const b of map.buildings)
            for (const f of b.floors)
                if (f.number === selectedFloor())
                    nodes.push(...f.nodes)
        return nodes
    })

    // Edges on selected floor as line segments (from → to)
    const floorEdges = createMemo(() => {
        const map = campusMap()
        const idx = nodeIndex()
        if (!map) return []
        const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
        for (const b of map.buildings)
            for (const f of b.floors)
                if (f.number === selectedFloor())
                    for (const e of f.edges) {
                        const from = idx.get(e.from)
                        const to = idx.get(e.to)
                        if (from && to) edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })
                    }
        return edges
    })

    // Active route nodes on this floor
    const routeOnFloor = createMemo(() => {
        const route = activeRoute()
        const idx = nodeIndex()
        if (!route) return []
        return route.path
            .map(id => idx.get(id))
            .filter((n): n is Node => !!n && n.floor === selectedFloor())
    })

    // EKF position dot → SVG coords for the selected floor
    const ekfPos = createMemo(() => {
        const state = ekfState()
        const cur = currentNode()
        if (!cur || cur.floor !== selectedFloor()) return null
        return { x: state.x, y: state.y }
    })

    function handleNodeTap(node: Node) {
        setDestinationById(node.id)
        setShowRouteCard(true)
        setSelectedFloor(node.floor)
    }

    // Scale SVG coord to px
    const toPx = (v: number) => (v / SVG_SIZE) * PX_SIZE

    return (
        <div class="screen-map">
            {/* Floor tabs */}
            <div class="map-floor-tabs" role="tablist" aria-label="Floor selector">
                <For each={Array.from({ length: maxFloor() + 1 }, (_, i) => i)}>
                    {(f) => (
                        <button
                            role="tab"
                            aria-selected={selectedFloor() === f}
                            class={`map-floor-tab ${selectedFloor() === f ? 'active' : ''}`}
                            onClick={() => setSelectedFloor(f)}
                        >
                            <FloorBadge floor={f} />
                        </button>
                    )}
                </For>
            </div>

            {/* SVG map */}
            <div class="map-svg-wrap" aria-label={`Floor ${selectedFloor()} map`}>
                <svg
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    width={PX_SIZE}
                    height={PX_SIZE}
                    class="map-svg"
                    role="img"
                    aria-label="Campus floor plan"
                >
                    {/* Corridor edges */}
                    <For each={floorEdges()}>
                        {(e) => (
                            <line
                                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                                stroke="#334155"
                                stroke-width="6"
                                stroke-linecap="round"
                            />
                        )}
                    </For>

                    {/* Active route highlight */}
                    <Show when={routeOnFloor().length > 1}>
                        <polyline
                            points={routeOnFloor().map(n => `${n.x},${n.y}`).join(' ')}
                            fill="none"
                            stroke="#63CAB7"
                            stroke-width="10"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            opacity="0.85"
                        />
                    </Show>

                    {/* All nodes */}
                    <For each={floorNodes()}>
                        {(node) => {
                            const isDestination = () => destination()?.id === node.id
                            const isCurrent = () => currentNode()?.id === node.id
                            const isRouteNode = () => routeOnFloor().some(n => n.id === node.id)
                            return (
                                <g
                                    class="map-node"
                                    onClick={() => handleNodeTap(node)}
                                    aria-label={node.label}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === 'Enter' && handleNodeTap(node)}
                                >
                                    <circle
                                        cx={node.x} cy={node.y} r={isDestination() ? 22 : 14}
                                        fill={
                                            isDestination() ? '#4ADE80' :
                                                isCurrent() ? '#63CAB7' :
                                                    isRouteNode() ? '#93C5FD' :
                                                        '#475569'
                                        }
                                        stroke="#0F172A"
                                        stroke-width="3"
                                    />
                                    <Show when={node.type === 'stair' || node.type === 'elevator'}>
                                        <text x={node.x} y={node.y + 5} text-anchor="middle" font-size="14" fill="#fff">
                                            {node.type === 'stair' ? '☰' : '⊡'}
                                        </text>
                                    </Show>
                                </g>
                            )
                        }}
                    </For>

                    {/* EKF position dot */}
                    <Show when={ekfPos()}>
                        <circle
                            cx={ekfPos()!.x} cy={ekfPos()!.y} r={10}
                            fill="#F59E0B"
                            stroke="#fff"
                            stroke-width="3"
                        />
                    </Show>
                </svg>

                {/* Accuracy ring (CSS overlay, positioned over the SVG) */}
                <Show when={ekfPos()}>
                    <AccuracyRing
                        cx={toPx(ekfPos()!.x)}
                        cy={toPx(ekfPos()!.y)}
                        pxPerMeter={PX_PER_M}
                    />
                </Show>
            </div>

            {/* Legend */}
            <div class="map-legend" aria-label="Map legend">
                <span><span class="legend-dot" style="background:#63CAB7" /> You</span>
                <span><span class="legend-dot" style="background:#4ADE80" /> Destination</span>
                <span><span class="legend-dot" style="background:#93C5FD" /> Route</span>
            </div>

            {/* Route card drawer */}
            <Show when={showRouteCard() && activeRoute()}>
                <RouteCard onClose={() => setShowRouteCard(false)} />
            </Show>
        </div>
    )
}

export default FloorMapScreen
