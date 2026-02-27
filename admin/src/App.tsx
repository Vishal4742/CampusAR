// admin/src/App.tsx
// CampusAR Admin Panel — Map Editor + QR Manager + Preview

import { createSignal, Show } from 'solid-js'
import './index.css'
import MapEditor from './components/MapEditor'
import NodeEditor from './components/NodeEditor'
import QRManager from './components/QRManager'
import type { Node, Edge } from '../../shared/types'

type Tab = 'editor' | 'qr' | 'preview'

// Seed with one floor
const DEFAULT_FLOOR = 0

export default function App() {
  const [tab, setTab] = createSignal<Tab>('editor')
  const [nodes, setNodes] = createSignal<Node[]>([])
  const [edges, setEdges] = createSignal<Edge[]>([])
  const [selectedNode, setSelectedNode] = createSignal<Node | null>(null)
  const [currentFloor, setCurrentFloor] = createSignal(DEFAULT_FLOOR)
  const [published, setPublished] = createSignal(false)

  // ─── Node actions ────────────────────────────────────────────────────────

  function handleAddNode(node: Node) {
    setNodes(prev => [...prev, node])
  }

  function handleUpdateNode(updated: Node) {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))
    setSelectedNode(updated)
  }

  function handleDeleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id))
    setSelectedNode(null)
  }

  function handleAddEdge(fromId: string, toId: string) {
    const from = nodes().find(n => n.id === fromId)
    const to = nodes().find(n => n.id === toId)
    if (!from || !to) return
    const dx = to.x - from.x, dy = to.y - from.y
    const weight = Math.round(Math.sqrt(dx * dx + dy * dy) / 10) // ~meters
    const edge: Edge = {
      id: `EDGE_${fromId}_${toId}_${Date.now()}`,
      from: fromId, to: toId,
      weight,
      bidirectional: true,
      type: 'corridor',
      accessible: from.accessible && to.accessible,
    }
    setEdges(prev => [...prev, edge])
  }

  function handleFloorSvg(full: string, simplified: string, skeleton: string) {
    // SVG stored — in a full app these would be persisted to Supabase
    console.info('[admin] SVG uploaded', { fullLen: full.length, simplifiedLen: simplified.length, skeletonLen: skeleton.length })
  }

  // ─── Export map JSON ─────────────────────────────────────────────────────

  function exportJSON() {
    const map = {
      id: 'oct_bhopal_main',
      name: 'Oriental College of Technology',
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      buildings: [{
        id: 'main_block',
        name: 'Main Academic Block',
        floors: [{
          id: `main_block_f${currentFloor()}`,
          number: currentFloor(),
          label: `Floor ${currentFloor()}`,
          svgFull: '', svgSimplified: '', svgSkeleton: '',
          nodes: nodes(),
          edges: edges(),
        }],
      }],
    }
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'oct_campus.json'; a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Preview mode — simulate navigation ──────────────────────────────────

  function handlePublish() {
    setPublished(true)
    setTimeout(() => setPublished(false), 3000)
  }

  return (
    <>
      {/* Top bar */}
      <div class="topbar">
        <h1>CampusAR Admin</h1>
        <div class="tool-group">
          {(['editor', 'qr', 'preview'] as const).map(t => (
            <button class={`tool-btn ${tab() === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {{ editor: '🗺 Map Editor', qr: '⬛ QR Codes', preview: '👁 Preview' }[t]}
            </button>
          ))}
        </div>
        <div class="topbar-spacer" />
        <span style={{ 'font-size': '12px', color: 'var(--text-3)' }}>
          {nodes().length} nodes · {edges().length} edges
        </span>
        <button class="topbar-btn" onClick={exportJSON}>⬇ Export JSON</button>
        <button class="topbar-btn topbar-btn--accent" onClick={handlePublish}>
          {published() ? '✓ Published!' : '🚀 Publish'}
        </button>
      </div>

      {/* Floor tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 16px', background: 'var(--bg-base)', 'border-bottom': '1px solid var(--border)' }}>
        {[0, 1, 2, 3, 4].map(f => (
          <button
            class={`tier-btn ${currentFloor() === f ? 'active' : ''}`}
            onClick={() => setCurrentFloor(f)}
          >
            {f === 0 ? 'G' : `${f}F`}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div class="admin-layout">
        {/* Left sidebar — node properties */}
        <Show when={tab() === 'editor'}>
          <aside class="sidebar">
            <NodeEditor
              node={selectedNode()}
              onUpdate={handleUpdateNode}
              onDelete={() => selectedNode() && handleDeleteNode(selectedNode()!.id)}
            />

            {/* Node list */}
            <div class="sidebar-section" style={{ flex: 1, overflow: 'auto' }}>
              <h2>All nodes ({nodes().filter(n => n.floor === currentFloor()).length} on floor {currentFloor()})</h2>
              {nodes().filter(n => n.floor === currentFloor()).map(node => (
                <div
                  style={{
                    display: 'flex', 'align-items': 'center', gap: '8px',
                    padding: '6px 8px', 'border-radius': '6px', cursor: 'pointer',
                    background: selectedNode()?.id === node.id ? 'rgba(99,202,183,.12)' : 'transparent',
                    'font-size': '12px',
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <span style={{ color: 'var(--text-3)', 'font-size': '11px' }}>{node.type}</span>
                  <span style={{ flex: 1 }}>{node.label}</span>
                  <Show when={node.hasQR}>
                    <span style={{ color: 'var(--accent)', 'font-size': '11px' }}>QR</span>
                  </Show>
                </div>
              ))}
            </div>
          </aside>
        </Show>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', 'flex-direction': 'column', padding: tab() === 'editor' ? '16px' : '0' }}>
          <Show when={tab() === 'editor'}>
            <MapEditor
              nodes={nodes().filter(n => n.floor === currentFloor())}
              edges={edges().filter(e => {
                const from = nodes().find(n => n.id === e.from)
                return from?.floor === currentFloor()
              })}
              selectedNode={selectedNode()}
              currentFloor={currentFloor()}
              onAddNode={handleAddNode}
              onSelectNode={setSelectedNode}
              onAddEdge={handleAddEdge}
              onDeleteNode={handleDeleteNode}
              onFloorSvgUploaded={handleFloorSvg}
            />
          </Show>

          <Show when={tab() === 'qr'}>
            <QRManager nodes={nodes()} />
          </Show>

          <Show when={tab() === 'preview'}>
            <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', gap: '16px', color: 'var(--text-2)' }}>
              <div style={{ 'font-size': '48px' }}>📱</div>
              <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-1)' }}>Preview Mode</div>
              <div style={{ 'font-size': '14px', 'text-align': 'center', 'max-width': '360px', 'line-height': '1.6' }}>
                Export JSON and load it into the student app to simulate navigation.
                Full in-browser preview is a Week 7+ feature.
              </div>
              <button class="topbar-btn topbar-btn--accent" onClick={exportJSON}>
                ⬇ Export map JSON for testing
              </button>
            </div>
          </Show>
        </main>
      </div>
    </>
  )
}
