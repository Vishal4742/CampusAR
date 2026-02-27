// admin/src/components/NodeEditor.tsx
// Sidebar panel for editing all properties of a selected node

import { type Component, createEffect, createSignal, Show } from 'solid-js'
import type { Node, NodeType } from '../../../shared/types'

interface Props {
    node: Node | null
    onUpdate: (updated: Node) => void
    onDelete: () => void
}

const NodeEditor: Component<Props> = (props) => {
    // Local signals for each field
    const [label, setLabel] = createSignal('')
    const [shortLabel, setShortLabel] = createSignal('')
    const [type, setType] = createSignal<NodeType>('junction')
    const [hasQR, setHasQR] = createSignal(false)
    const [accessible, setAccessible] = createSignal(true)
    const [facingDeg, setFacingDeg] = createSignal(0)
    const [corridorAxis, setCorridorAxis] = createSignal<'NS' | 'EW'>('NS')
    const [tags, setTags] = createSignal('')

    // Sync from props.node
    createEffect(() => {
        const n = props.node
        if (!n) return
        setLabel(n.label)
        setShortLabel(n.shortLabel)
        setType(n.type)
        setHasQR(n.hasQR)
        setAccessible(n.accessible)
        setFacingDeg(n.facingDeg ?? 0)
        setCorridorAxis(n.corridorAxis ?? 'NS')
        setTags(n.tags.join(', '))
    })

    function handleSave() {
        const n = props.node
        if (!n) return
        const updated: Node = {
            ...n,
            label: label(),
            shortLabel: shortLabel(),
            type: type(),
            hasQR: hasQR(),
            accessible: accessible(),
            facingDeg: facingDeg(),
            corridorAxis: corridorAxis(),
            tags: tags().split(',').map(t => t.trim()).filter(Boolean),
            qrData: hasQR() ? JSON.stringify({
                app: 'campusar', v: 2,
                node: n.id, floor: n.floor, x: n.x, y: n.y,
                label: label(), facingDeg: facingDeg(),
                corridorAxis: corridorAxis(), nextNodes: n.nextNodes ?? [],
            }) : '',
        }
        props.onUpdate(updated)
    }

    const NODE_TYPES: NodeType[] = ['room', 'junction', 'stair', 'elevator', 'entrance', 'exit']

    return (
        <Show when={props.node} fallback={
            <div style={{ padding: '20px', color: 'var(--text-3)', 'text-align': 'center', 'font-size': '13px' }}>
                Click a node to edit its properties
            </div>
        }>
            <div class="sidebar-section">
                <h2>Node Properties</h2>

                <div class="form-group">
                    <label class="form-label" for="node-id">ID (read-only)</label>
                    <input id="node-id" class="form-input" value={props.node!.id} readonly style={{ opacity: '0.5' }} />
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="node-label">Label</label>
                        <input id="node-label" class="form-input" value={label()} onInput={e => setLabel(e.currentTarget.value)} placeholder="CSE Lab 2" />
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="node-short">Short Label</label>
                        <input id="node-short" class="form-input" value={shortLabel()} onInput={e => setShortLabel(e.currentTarget.value)} placeholder="Lab 2" />
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="node-type">Type</label>
                    <select id="node-type" class="form-select" value={type()} onChange={e => setType(e.currentTarget.value as NodeType)}>
                        {NODE_TYPES.map(t => <option value={t}>{t}</option>)}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="node-facing">Facing° (compass)</label>
                        <input id="node-facing" class="form-input" type="number" min={0} max={359} value={facingDeg()} onInput={e => setFacingDeg(+e.currentTarget.value)} />
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="node-axis">Corridor Axis</label>
                        <select id="node-axis" class="form-select" value={corridorAxis()} onChange={e => setCorridorAxis(e.currentTarget.value as 'NS' | 'EW')}>
                            <option value="NS">N–S</option>
                            <option value="EW">E–W</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="node-tags">Tags (comma-separated)</label>
                    <input id="node-tags" class="form-input" value={tags()} onInput={e => setTags(e.currentTarget.value)} placeholder="cse, lab, computer" />
                </div>

                <label class="checkbox-row">
                    <input type="checkbox" checked={hasQR()} onChange={e => setHasQR(e.currentTarget.checked)} />
                    Has QR code
                </label>
                <label class="checkbox-row">
                    <input type="checkbox" checked={accessible()} onChange={e => setAccessible(e.currentTarget.checked)} />
                    Wheelchair accessible
                </label>

                <div style={{ display: 'flex', gap: '8px', 'margin-top': '12px' }}>
                    <button class="topbar-btn topbar-btn--accent" style={{ flex: 1 }} onClick={handleSave}>
                        Save Node
                    </button>
                    <button class="topbar-btn topbar-btn--danger" onClick={props.onDelete}>
                        Delete
                    </button>
                </div>
            </div>
        </Show>
    )
}

export default NodeEditor
