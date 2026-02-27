// admin/src/components/QRManager.tsx
// View all QR-enabled nodes, preview QR SVGs, export to PDF

import { type Component, For, Show, createMemo } from 'solid-js'
import type { Node } from '../../../shared/types'
import { generateQRSvg, buildQRPayload, payloadToString } from '../engine/qrCode'
import { exportQRPDF } from '../engine/exportQRPDF'

interface Props {
    nodes: Node[]
}

const QRManager: Component<Props> = (props) => {
    const qrNodes = createMemo(() => props.nodes.filter(n => n.hasQR))

    function getQRSvg(node: Node): string {
        const payload = buildQRPayload({
            node: node.id,
            floor: node.floor,
            x: node.x,
            y: node.y,
            label: node.label,
            facingDeg: node.facingDeg ?? 0,
            corridorAxis: node.corridorAxis ?? 'NS',
            nextNodes: node.nextNodes ?? [],
        })
        return generateQRSvg(payloadToString(payload), 140)
    }

    async function handleExport() {
        await exportQRPDF(props.nodes)
    }

    return (
        <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', 'align-items': 'center', padding: '12px 20px', 'border-bottom': '1px solid var(--border)', gap: '12px' }}>
                <span style={{ 'font-size': '13px', color: 'var(--text-2)' }}>
                    {qrNodes().length} QR node{qrNodes().length !== 1 ? 's' : ''} ready
                </span>
                <div style={{ flex: 1 }} />
                <button
                    class="topbar-btn topbar-btn--accent"
                    onClick={handleExport}
                    disabled={qrNodes().length === 0}
                >
                    🖨 Export PDF
                </button>
            </div>

            {/* QR grid */}
            <Show
                when={qrNodes().length > 0}
                fallback={
                    <div style={{ flex: 1, display: 'flex', 'align-items': 'center', 'justify-content': 'center', color: 'var(--text-3)', 'font-size': '14px' }}>
                        No nodes with QR enabled yet.<br />Select a node and check "Has QR code" in the editor.
                    </div>
                }
            >
                <div class="qr-grid">
                    <For each={qrNodes()}>
                        {(node) => (
                            <div class="qr-card">
                                <div innerHTML={getQRSvg(node)} />
                                <span class="qr-card-label">{node.label}</span>
                                <span class="qr-card-meta">Floor {node.floor}</span>
                                <span class="qr-card-meta" style={{ 'font-size': '10px', color: 'var(--text-3)' }}>{node.id}</span>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    )
}

export default QRManager
