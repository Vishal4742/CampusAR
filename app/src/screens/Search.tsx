// app/src/screens/Search.tsx
// Trie-powered instant search — §19.6: results in ~0.3ms

import { type Component, createSignal, createMemo, For, Show, onMount } from 'solid-js'
import { searchIndex } from '../engine/searchIndex'
import navStore from '../store/navStore'
import type { Node } from '../../../shared/types'

interface Props {
    onNavigate: (nodeId: string) => void
}

const SearchScreen: Component<Props> = (props) => {
    const [query, setQuery] = createSignal('')
    let inputRef!: HTMLInputElement

    const { campusMap } = navStore

    // Build search index whenever campus map loads
    onMount(() => {
        const map = campusMap()
        if (!map) return
        const allNodes: Node[] = []
        for (const building of map.buildings)
            for (const floor of building.floors)
                allNodes.push(...floor.nodes)
        searchIndex.build(allNodes)
    })

    const results = createMemo(() => searchIndex.search(query(), 15))

    function handleSelect(node: Node) {
        navStore.setDestinationById(node.id)
        props.onNavigate(node.id)
    }

    // Auto-focus input on mount
    onMount(() => inputRef?.focus())

    return (
        <div class="screen-search">
            {/* Search bar */}
            <div class="search-bar">
                <span class="search-icon" aria-hidden="true">🔍</span>
                <input
                    ref={inputRef}
                    id="search-input"
                    type="search"
                    class="search-input"
                    placeholder="Search rooms, labs, offices…"
                    value={query()}
                    onInput={e => setQuery(e.currentTarget.value)}
                    autocomplete="off"
                    aria-label="Search campus locations"
                    aria-controls="search-results"
                />
                <Show when={query().length > 0}>
                    <button
                        class="search-clear"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                    >✕</button>
                </Show>
            </div>

            {/* Results */}
            <ol id="search-results" class="search-results" role="listbox" aria-label="Search results">
                <For each={results()} fallback={
                    <Show when={query().length > 0}>
                        <li class="search-no-results">No results for "{query()}"</li>
                    </Show>
                }>
                    {(node) => (
                        <li
                            class="search-result-item"
                            role="option"
                            tabIndex={0}
                            onClick={() => handleSelect(node)}
                            onKeyDown={e => e.key === 'Enter' && handleSelect(node)}
                        >
                            <div class="search-result-icon">
                                {nodeIcon(node.type)}
                            </div>
                            <div class="search-result-info">
                                <span class="search-result-label">{node.label}</span>
                                <span class="search-result-meta">
                                    Floor {node.floor} · {node.type}
                                </span>
                            </div>
                            <span class="search-result-chevron" aria-hidden="true">›</span>
                        </li>
                    )}
                </For>
            </ol>
        </div>
    )
}

function nodeIcon(type: Node['type']): string {
    switch (type) {
        case 'room': return '🚪'
        case 'junction': return '⊕'
        case 'stair': return '🪜'
        case 'elevator': return '🛗'
        case 'entrance': return '🚪'
        case 'exit': return '🚪'
        default: return '📍'
    }
}

export default SearchScreen
