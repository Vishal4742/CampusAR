// app/src/components/AccuracyRing.tsx
// 2D map accuracy ring — §17.4
// Grows as EKF covariance grows; shrinks after a QR fix

import { type Component, createMemo } from 'solid-js'
import { sensorStore } from '../store/sensorStore'

interface Props {
    /** SVG x-coord of the estimated position dot */
    cx: number
    /** SVG y-coord of the estimated position dot */
    cy: number
    /** Pixels-per-meter scale for the floor SVG */
    pxPerMeter: number
}

const AccuracyRing: Component<Props> = (props) => {
    const { ekfState } = sensorStore

    // 1σ horizontal position uncertainty (m) = sqrt of P[0][0]+P[1][1] average
    const uncertaintyM = createMemo(() => {
        const P = ekfState().cov
        return Math.sqrt((P[0][0] + P[1][1]) / 2)
    })

    const radiusPx = createMemo(() =>
        Math.max(8, Math.min(uncertaintyM() * props.pxPerMeter, 120))
    )

    return (
        <div
            class="accuracy-ring"
            style={{
                width: `${radiusPx() * 2}px`,
                height: `${radiusPx() * 2}px`,
                left: `${props.cx}px`,
                top: `${props.cy}px`,
            }}
            aria-hidden="true"
        />
    )
}

export default AccuracyRing
