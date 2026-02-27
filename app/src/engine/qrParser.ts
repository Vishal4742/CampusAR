// app/src/engine/qrParser.ts
// CampusAR QR payload decoder — validates and parses v2 QR data (§9.1, §17.3.1)

import type { QRPayload } from '../../../shared/types'

export interface ParseResult {
    ok: true
    payload: QRPayload
}

export interface ParseError {
    ok: false
    reason: string
}

export function parseQRPayload(raw: string): ParseResult | ParseError {
    let data: unknown
    try {
        data = JSON.parse(raw)
    } catch {
        return { ok: false, reason: 'Not valid JSON' }
    }

    if (!data || typeof data !== 'object') {
        return { ok: false, reason: 'Payload is not an object' }
    }

    const d = data as Record<string, unknown>

    if (d.app !== 'campusar') {
        return { ok: false, reason: 'Not a CampusAR QR code' }
    }

    // Accept v1 for backward compat, coerce to v2 shape
    if (d.v !== 1 && d.v !== 2) {
        return { ok: false, reason: `Unknown version: ${d.v}` }
    }

    if (typeof d.node !== 'string') return { ok: false, reason: 'Missing node' }
    if (typeof d.floor !== 'number') return { ok: false, reason: 'Missing floor' }
    if (typeof d.x !== 'number') return { ok: false, reason: 'Missing x' }
    if (typeof d.y !== 'number') return { ok: false, reason: 'Missing y' }
    if (typeof d.label !== 'string') return { ok: false, reason: 'Missing label' }

    return {
        ok: true,
        payload: {
            app: 'campusar',
            v: 2,
            node: d.node as string,
            floor: d.floor as number,
            x: d.x as number,
            y: d.y as number,
            label: d.label as string,
            facingDeg: typeof d.facingDeg === 'number' ? d.facingDeg : 0,
            corridorAxis: d.corridorAxis === 'NS' ? 'NS' : 'EW',
            nextNodes: Array.isArray(d.nextNodes) ? d.nextNodes as string[] : [],
        }
    }
}
