# Admin Dashboard Visual Direction

Owner: CLI 2, WSL Codex.

Status: planning direction for future React dashboard implementation. Do not scaffold React/Vite until approved.

## Reference Status

The local visual reference was provided as `C:` only, which is not a complete readable path from this WSL session. The usable direction is the textual brief:

- dark analog-signal UI
- sparse chrome
- serif plus mono typography
- film grain
- warm horizon gradient
- coordinate and status language
- operational campus signal console
- dense but calm, dark, precise, map-first, status-heavy
- subtle amber/orange active accents
- no generic SaaS cards

## Product Feel

The admin dashboard should feel like a campus operations console, not a SaaS analytics template.

Core principles:

- Map first: the campus map or spatial review surface owns the primary viewport.
- Status heavy: every pending location, edge, gate, and mapper action should expose state, confidence, cursor, and coordinate status.
- Sparse chrome: navigation and controls stay compact and quiet.
- Dense but calm: high information density without decorative card piles.
- Precise language: labels should read like coordinates, signals, queue states, map versions, and review commands.

## Layout Direction

Preferred first production layout:

- Full-viewport dark shell.
- Map canvas or map review surface in the center, roughly 60-70 percent of desktop width.
- Left rail for campus, map version, sync cursor, queue counts, and map lock.
- Right inspector for selected location, gate, landmark, building, path edge, or dispute.
- Bottom event strip for audit log, mapper submissions, sync changes, and relay activity.
- Top utility strip only for environment, admin identity, health, and critical actions.

Avoid:

- marketing hero sections
- generic KPI card grids
- bright SaaS dashboard styling
- oversized rounded cards
- empty decoration that does not carry map/status meaning

## Visual System

Palette:

- base: near-black graphite
- surface: charcoal with subtle grain
- active: amber/orange signal accent
- warning: amber
- danger: muted red
- verified: subdued green
- provisional: amber
- unknown: gray

Typography:

- serif for the product/admin title and rare large section labels
- monospace for coordinates, IDs, status, timestamps, cursors, map versions, and counts
- compact sans-serif or mono for controls if readability requires it

Texture:

- subtle film grain is acceptable
- warm horizon gradient may sit behind the map/status shell
- no decorative blobs or generic gradient orbs

## Dashboard States

The UI must make these states visually distinct:

- `unknown`: no coordinate or unverified source
- `provisional`: draft coordinate or mapper walk
- `pending_confirmation`: waiting for user confirmations
- `pending_admin_review`: ready for admin decision
- `verified`: approved for navigation
- `rejected`: not usable
- `suspended`: hidden from normal navigation
- `expired`: temporary location expired

## Primary Views

- Map review: locations, gates, landmarks, buildings, edges, confidence, status, and source.
- Pending queue: mapper submissions and confirmation counts.
- Edge review: from/to node, geometry status, walk count, accessibility, confidence.
- Map version console: draft/published version, latest change id, sparse-map state.
- Admin actions: approve, reject, edit label, mark duplicate, suspend, lock mapping.
- Audit/event strip: append-only operational history.

## Copy Style

Use coordinate/status language:

- `OCT / map v1 / draft`
- `lat 23.2462927 / lng 77.5019383`
- `coord provisional`
- `signal pending_admin_review`
- `graph sparse`
- `edge walk_count 0`
- `cursor 1482`

Avoid explanatory marketing text inside the dashboard.
