// app/src/engine/graph.ts
// Builds an adjacency list from Floor nodes + edges (§8.1, §11 Week 2)

import type { Node, Edge } from '../../../shared/types'

export type AdjacencyList = Map<string, Array<{ to: string; weight: number }>>

/**
 * Build an adjacency list from all nodes + edges across all floors.
 * Bidirectional edges are added in both directions automatically.
 */
export function buildGraph(nodes: Node[], edges: Edge[]): AdjacencyList {
    const graph: AdjacencyList = new Map()

    // Initialise every node with an empty neighbour list
    for (const node of nodes) {
        graph.set(node.id, [])
    }

    for (const edge of edges) {
        const fromList = graph.get(edge.from)
        const toList = graph.get(edge.to)

        if (fromList) fromList.push({ to: edge.to, weight: edge.weight })
        if (toList && edge.bidirectional) {
            toList.push({ to: edge.from, weight: edge.weight })
        }
    }

    return graph
}
