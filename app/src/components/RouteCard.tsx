// app/src/components/RouteCard.tsx
// Step-by-step text fallback for when AR is unavailable

import { type Component, For, Show, createMemo } from 'solid-js'
import navStore from '../store/navStore'
import { formatDistance, formatETA, walkingETA } from '../utils/distance'
import FloorBadge from './FloorBadge'

interface Props {
    onClose?: () => void
}

const RouteCard: Component<Props> = (props) => {
    const { activeRoute, nodeIndex, currentNode, destination } = navStore

    const steps = createMemo(() => {
        const route = activeRoute()
        const idx = nodeIndex()
        if (!route || route.path.length < 2) return []

        const result: Array<{ label: string; floor: number; isStair: boolean; distToNext: number }> = []

        for (let i = 0; i < route.path.length; i++) {
            const node = idx.get(route.path[i])
            if (!node) continue
            const next = i < route.path.length - 1 ? idx.get(route.path[i + 1]) : null
            const isStair = node.type === 'stair' || node.type === 'elevator'
            // Approximate distance to next waypoint (route.distance is total)
            const distToNext = next
                ? Math.sqrt((next.x - node.x) ** 2 + (next.y - node.y) ** 2)
                : 0
            result.push({ label: node.label, floor: node.floor, isStair, distToNext })
        }
        return result
    })

    const totalDist = createMemo(() => activeRoute()?.distance ?? 0)

    return (
        <Show when={activeRoute()}>
            <div class="route-card">
                {/* Header */}
                <div class="route-card__header">
                    <div class="route-card__title">
                        <span class="route-card__from">{currentNode()?.shortLabel ?? 'Start'}</span>
                        <span class="route-card__arrow">→</span>
                        <span class="route-card__to">{destination()?.label ?? ''}</span>
                    </div>
                    <div class="route-card__meta">
                        {formatDistance(totalDist())} · {formatETA(walkingETA(totalDist()))}
                    </div>
                    <Show when={props.onClose}>
                        <button class="route-card__close" onClick={props.onClose} aria-label="Close">✕</button>
                    </Show>
                </div>

                {/* Step list */}
                <ol class="route-card__steps">
                    <For each={steps()}>
                        {(step, i) => (
                            <li class={`route-step ${step.isStair ? 'route-step--stair' : ''}`}>
                                <FloorBadge floor={step.floor} />
                                <span class="route-step__label">
                                    {i() === 0 ? '📍 ' : step.isStair ? '🪜 ' : '→ '}
                                    {step.label}
                                </span>
                                <Show when={step.distToNext > 0}>
                                    <span class="route-step__dist">{formatDistance(step.distToNext)}</span>
                                </Show>
                            </li>
                        )}
                    </For>
                </ol>
            </div>
        </Show>
    )
}

export default RouteCard
