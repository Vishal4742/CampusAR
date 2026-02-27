// app/src/components/FloorBadge.tsx
// Small pill showing current floor number — used in Navigate + FloorMap

import { type Component } from 'solid-js'

interface Props {
    floor: number
    label?: string
}

const FloorBadge: Component<Props> = (props) => {
    const label = () => props.label ?? floorLabel(props.floor)
    return (
        <div class="floor-badge" aria-label={`Floor ${props.floor}`}>
            {label()}
        </div>
    )
}

function floorLabel(floor: number): string {
    if (floor === 0) return 'G'
    if (floor === 1) return '1st'
    if (floor === 2) return '2nd'
    if (floor === 3) return '3rd'
    return `${floor}th`
}

export default FloorBadge
