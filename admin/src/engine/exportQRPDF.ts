// admin/src/engine/exportQRPDF.ts
// Offline QR PDF export using jsPDF (§18.7) — no server needed

import type { Node } from '../../../shared/types'
import { generateQRSvg, buildQRPayload, payloadToString } from './qrCode'

/**
 * Export all nodes with QR codes to a printable PDF.
 * Each page contains a QR code + label + node ID for lamination.
 * Uses jsPDF via dynamic import so it's only loaded when Print is clicked.
 */
export async function exportQRPDF(nodes: Node[]): Promise<void> {
    // Dynamic import — not in main bundle
    const { jsPDF } = await import('jspdf')

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    })

    const cols = 2
    const cellW = 90    // mm
    const cellH = 110   // mm
    const marginX = 10
    const marginY = 10

    let i = 0
    for (const node of nodes) {
        if (!node.hasQR) continue

        const col = i % cols
        const row = Math.floor(i / cols) % 2

        // New page every 4 QR codes
        if (i > 0 && i % (cols * 2) === 0) {
            pdf.addPage()
        }

        const x = marginX + col * cellW
        const y = marginY + row * cellH

        // QR code — render SVG to canvas via Image
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
        const svgStr = generateQRSvg(payloadToString(payload), 200)

        // Embed SVG as base64 image
        const blob = new Blob([svgStr], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const img = await loadImage(url)
        URL.revokeObjectURL(url)

        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 200
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')

        pdf.addImage(dataUrl, 'PNG', x + 10, y + 5, 70, 70)

        // Label
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        const labelLines = pdf.splitTextToSize(node.label, cellW - 20)
        pdf.text(labelLines, x + cellW / 2, y + 82, { align: 'center' })

        // Node ID (small)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(120, 120, 120)
        pdf.text(node.id, x + cellW / 2, y + 90, { align: 'center' })
        pdf.setTextColor(0, 0, 0)

        // Floor badge
        pdf.setFontSize(9)
        pdf.text(`Floor ${node.floor}`, x + cellW / 2, y + 97, { align: 'center' })

        // Border
        pdf.setDrawColor(200, 200, 200)
        pdf.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 3, 3, 'S')

        i++
    }

    pdf.save('campusar-qr-codes.pdf')
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}
