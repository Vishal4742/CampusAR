// shared/types.ts — CampusAR shared TypeScript interfaces
// Used by both the student app and admin panel

export type NodeType = 'room' | 'junction' | 'stair' | 'elevator' | 'entrance' | 'exit'
export type EdgeType = 'corridor' | 'stair' | 'outdoor'

export interface CampusMap {
    id: string          // "oct_bhopal_main"
    name: string        // "Oriental College of Technology"
    version: number     // increments on every admin update
    updatedAt: string   // ISO timestamp
    buildings: Building[]
}

export interface Building {
    id: string          // "main_block"
    name: string        // "Main Academic Block"
    floors: Floor[]
}

export interface Floor {
    id: string          // "main_block_f2"
    number: number      // 2
    label: string       // "Second Floor"
    svgFull: string     // Base64 SVG — full detail
    svgSimplified: string  // Base64 SVG — walls only (~8kB)
    svgSkeleton: string    // Base64 SVG — corridor lines only (~2kB)
    nodes: Node[]
    edges: Edge[]
}

export interface Node {
    id: string          // "QR_CSE_LAB2_F2_07"
    type: NodeType
    label: string       // "CSE Lab 2"
    shortLabel: string  // "Lab 2"
    x: number           // position on floor SVG (0–1000)
    y: number
    floor: number
    building: string    // "main_block"
    hasQR: boolean
    qrData: string      // encoded QR string
    tags: string[]      // ["cse", "lab", "computer"]
    accessible: boolean // wheelchair/no-stairs accessible
    // v2 fields (§17.3.1)
    facingDeg?: number  // expected compass bearing when scanning this QR
    corridorAxis?: 'NS' | 'EW'
    nextNodes?: string[] // adjacent QR node IDs
}

export interface Edge {
    id: string          // "EDGE_001"
    from: string        // Node ID
    to: string          // Node ID
    weight: number      // walking distance in meters
    bidirectional: boolean
    type: EdgeType
    accessible: boolean
}

// Precomputed route cache entry
export interface CachedRoute {
    path: string[]      // ordered array of Node IDs
    distance: number    // total meters
    floors: number[]    // floors traversed
}

// QR code v2 payload (§17.3.1)
export interface QRPayload {
    app: 'campusar'
    v: 2
    node: string
    floor: number
    x: number
    y: number
    label: string
    facingDeg: number
    corridorAxis: 'NS' | 'EW'
    nextNodes: string[]
}

// Sync delta patch (§18.2)
export interface DeltaPatch {
    fromVersion: number
    toVersion: number
    changes: DeltaChange[]
}

export type DeltaChange =
    | { op: 'update'; type: 'node'; id: string;[key: string]: unknown }
    | { op: 'add'; type: 'node'; data: Node }
    | { op: 'delete'; type: 'node'; id: string }
    | { op: 'add'; type: 'edge'; data: Edge }
    | { op: 'delete'; type: 'edge'; id: string }
