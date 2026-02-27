// admin/src/components/MapEditor.tsx
// SVG map editor: upload floor plan, click to place nodes, draw edges

import { type Component, createSignal, For, Show } from 'solid-js'
import type { Node, Edge, NodeType } from '../../../shared/types'
import { tierSimplified, tierSkeleton, svgToBase64 } from '../engine/svgTier'

interface Props {
    nodes: Node[]
    edges: Edge[]
    selectedNode: Node | null
    onAddNode: (node: Node) => void
    onSelectNode: (node: Node | null) => void
    onAddEdge: (fromId: string, toId: string) => void
    onDeleteNode: (id: string) => void
    onFloorSvgUploaded: (svgFull: string, svgSimplified: string, svgSkeleton: string) => void
    currentFloor: number
}

const SVG_SIZE = 1000
const CANVAS_PX = 700

const MapEditor: Component<Props> = (props) => {
    const [tool, setTool] = createSignal<'add' | 'edge' | 'select' | 'delete'>('add')
    const [edgeFrom, setEdgeFrom] = createSignal<string | null>(null)
    const [svgBackground, setSvgBackground] = createSignal<string>('')
    const [tierView, setTierView] = createSignal<'full' | 'simplified' | 'skeleton'>('full')

    // Scale canvas px → SVG coords
    const toSvg = (px: number) => (px / CANVAS_PX) * SVG_SIZE

    function handleCanvasClick(e: MouseEvent) {
        if (tool() !== 'add') return
        const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
        const x = Math.round(toSvg(e.clientX - rect.left))
        const y = Math.round(toSvg(e.clientY - rect.top))
        const newNode: Node = {
            id: `NODE_F${props.currentFloor}_${Date.now()}`,
            type: 'junction',
            label: 'New Node',
            shortLabel: 'Node',
            x, y,
            floor: props.currentFloor,
            building: 'main_block',
            hasQR: false,
            qrData: '',
            tags: [],
            accessible: true,
        }
        props.onAddNode(newNode)
        props.onSelectNode(newNode)
    }

    function handleNodeClick(e: MouseEvent, node: Node) {
        e.stopPropagation()
        if (tool() === 'delete') { props.onDeleteNode(node.id); return }
        if (tool() === 'edge') {
            const from = edgeFrom()
            if (!from) { setEdgeFrom(node.id); return }
            if (from !== node.id) {
                props.onAddEdge(from, node.id)
                setEdgeFrom(null)
            } else {
                setEdgeFrom(null)
            }
            return
        }
        props.onSelectNode(node)
    }

    async function handleSvgUpload(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const text = await file.text()
        const simplified = tierSimplified(text)
        const skeleton = tierSkeleton(text)
        setSvgBackground(`data:image/svg+xml;base64,${svgToBase64(text)}`)
        props.onFloorSvgUploaded(svgToBase64(text), svgToBase64(simplified), svgToBase64(skeleton))
    }

    function nodeColor(type: NodeType): string {
        switch (type) {
            case 'room': return 'var(--node-room)'
            case 'stair':
            case 'elevator': return 'var(--node-stair)'
            case 'entrance':
            case 'exit': return 'var(--node-entry)'
            default: return 'var(--node-junc)'
        }
    }

    return (
        <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', gap: '8px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
                <div class="tool-group">
                    {(['add', 'select', 'edge', 'delete'] as const).map(t => (
                        <button class={`tool-btn ${tool() === t ? 'active' : ''}`} onClick={() => { setTool(t); setEdgeFrom(null) }}>
                            {{ add: '+ Node', select: '↖ Select', edge: '— Edge', delete: '🗑 Delete' }[t]}
                        </button>
                    ))}
                </div>
                <div class="tool-group" style={{ 'margin-left': 'auto' }}>
                    {(['full', 'simplified', 'skeleton'] as const).map(t => (
                        <button class={`tier-btn ${tierView() === t ? 'active' : ''}`} onClick={() => setTierView(t)}>
                            {t}
                        </button>
                    ))}
                </div>
                <label style={{ cursor: 'pointer', padding: '4px 12px', border: '1px solid var(--border)', 'border-radius': '6px', 'font-size': '12px', color: 'var(--text-2)' }}>
                    📁 Upload SVG
                    <input type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }} onChange={handleSvgUpload} />
                </label>
            </div>

            {/* Edge mode tip */}
            <Show when={tool() === 'edge'}>
                <div style={{ 'font-size': '12px', color: 'var(--accent)', padding: '4px 8px', background: 'rgba(99,202,183,.1)', 'border-radius': '6px' }}>
                    {edgeFrom() ? `Click destination node (from: ${edgeFrom()})` : 'Click source node to start edge'}
                </div>
            </Show>

            {/* Canvas */}
            <div class="map-canvas-wrap" style={{ width: `${CANVAS_PX}px`, height: `${CANVAS_PX}px` }}>
                <svg
                    class="map-canvas"
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    width={CANVAS_PX}
                    height={CANVAS_PX}
                    onClick={handleCanvasClick}
                    style={{ cursor: tool() === 'add' ? 'crosshair' : tool() === 'delete' ? 'not-allowed' : 'default' }}
                >
                    {/* Floor plan background */}
                    <Show when={svgBackground()}>
                        <image href={svgBackground()} x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} opacity={0.35} />
                    </Show>

                    {/* Edges */}
                    <For each={props.edges}>
                        {(edge) => {
                            const fromNode = props.nodes.find(n => n.id === edge.from)
                            const toNode = props.nodes.find(n => n.id === edge.to)
                            if (!fromNode || !toNode) return <></>
                            return (
                                <line
                                    x1={fromNode.x} y1={fromNode.y}
                                    x2={toNode.x} y2={toNode.y}
                                    stroke="var(--border)"
                                    stroke-width="6"
                                    stroke-linecap="round"
                                />
                            )
                        }}
                    </For>

                    {/* Nodes */}
                    <For each={props.nodes}>
                        {(node) => {
                            const isSelected = () => props.selectedNode?.id === node.id
                            const isFromEdge = () => edgeFrom() === node.id
                            return (
                                <g onClick={(e) => handleNodeClick(e, node)}>
                                    <circle
                                        class="map-node-dot"
                                        cx={node.x} cy={node.y}
                                        r={isSelected() ? 16 : isFromEdge() ? 14 : 10}
                                        fill={nodeColor(node.type)}
                                        stroke={isSelected() ? '#fff' : isFromEdge() ? 'var(--accent)' : '#0F172A'}
                                        stroke-width={isSelected() ? 3 : 2}
                                        opacity={0.9}
                                    />
                                    <text
                                        x={node.x} y={node.y + 24}
                                        text-anchor="middle"
                                        font-size="11"
                                        fill="var(--text-2)"
                                        pointer-events="none"
                                    >
                                        {node.shortLabel}
                                    </text>
                                    <Show when={node.hasQR}>
                                        <text x={node.x + 12} y={node.y - 10} font-size="12" fill="var(--accent)">⬛</text>
                                    </Show>
                                </g>
                            )
                        }}
                    </For>
                </svg>
            </div>
        </div>
    )
}

export default MapEditor
