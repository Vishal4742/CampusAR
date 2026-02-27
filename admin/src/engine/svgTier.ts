// admin/src/engine/svgTier.ts
// SVG tiering: full / simplified / skeleton (§18.4)
// Takes an inline SVG string and strips layers to produce smaller tiers.

/**
 * Extract the full SVG as-is.
 */
export function tierFull(svg: string): string {
    return svg
}

/**
 * Simplified SVG — keep only <rect> walls and <polyline> corridors.
 * Strips text labels, icons, room numbers, and decorations.
 */
export function tierSimplified(svg: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svg, 'image/svg+xml')
    const root = doc.documentElement

    // Remove unwanted elements
    const strip = root.querySelectorAll('text, image, use, symbol, title, desc, circle[r="2"], g.labels, g.icons')
    strip.forEach(el => el.remove())

    // Strip data-attributes and unnecessary attrs
    root.querySelectorAll('*').forEach(el => {
        ['data-room', 'data-type', 'data-id', 'inkscape:label', 'sodipodi:type'].forEach(attr => {
            el.removeAttribute(attr)
        })
    })

    return new XMLSerializer().serializeToString(doc)
}

/**
 * Skeleton SVG — corridor lines only.
 * Keep only <line>, <polyline>, <path> with data-type="corridor".
 * Everything else is removed.
 */
export function tierSkeleton(svg: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svg, 'image/svg+xml')
    const root = doc.documentElement

    // Collect corridor paths (authored with data-type="corridor")
    const corridors = Array.from(root.querySelectorAll('[data-type="corridor"], .corridor, .path'))

    // Clear all children from root
    while (root.firstChild) root.removeChild(root.firstChild)

    // Add back only corridors
    for (const el of corridors) root.appendChild(el)

    // Minimal viewBox
    const vb = doc.documentElement.getAttribute('viewBox') ?? '0 0 1000 1000'
    root.setAttribute('viewBox', vb)

    return new XMLSerializer().serializeToString(doc)
}

/**
 * Encode an SVG string to Base64 for storage in the CampusMap JSON.
 */
export function svgToBase64(svg: string): string {
    return btoa(unescape(encodeURIComponent(svg)))
}

/**
 * Decode a Base64 SVG string back to inline SVG.
 */
export function base64ToSvg(b64: string): string {
    return decodeURIComponent(escape(atob(b64)))
}
