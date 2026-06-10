# CampusAR Admin Dashboard

Owner: CLI 2, WSL Codex.

This is the planning scaffold for the React admin dashboard. No React/Vite dependencies are installed yet.

Visual direction is captured in `VISUAL_DIRECTION.md`.

## Phase 1 Scope

The SRS places the first admin dashboard implementation in Phase 3. During Phase 1, CLI 2 only prepares backend contracts and data shapes that the dashboard will later consume.

Phase 1 dashboard-facing contracts:

- Admin login and role authorization.
- User role management.
- Map lock state.
- Confirmation thresholds by location category.
- Pending location review data shape.
- Admin audit events.

## Current Scaffold

`index.html` is a no-build contract console. It can call:

- `/health`
- `/api/v1/routes`
- `/api/v1/sync/manifest`
- `/api/v1/admin/users`
- `/api/v1/admin/thresholds`
- `/api/v1/admin/map-lock`

It is not the final React dashboard. It exists to smoke-test backend contracts until dashboard tooling is approved.

## Future Dashboard Views

- Map-first review surface for OCT locations, buildings, gates, landmarks, and path edges.
- Pending location approvals with coordinate status, confidence, mapper, source, and confirmation count.
- Disputes and conflicting labels.
- Location edit and override workflow.
- Map lock controls.
- Confirmation threshold settings.
- User and role management.
- Occupancy heatmap.
- Map version console for draft/published state, sparse-map state, latest change id, and sync health.

## Visual Planning Rules

- Use a dark operational campus signal-console language.
- Keep the map or spatial review surface as the primary viewport.
- Use sparse chrome, mono status labels, coordinate readouts, map version IDs, sync cursors, and confidence values.
- Use subtle amber/orange accents for active/provisional state.
- Avoid generic SaaS cards, bright dashboards, oversized rounded panels, and marketing-style text.
- Treat unknown/provisional coordinates as first-class review states.

## Decisions Still Needed

- React scaffold tool after approval.
- Design system or component library.
- Auth token storage approach.
- Admin dashboard routing structure.
- Whether dashboard is deployed with the backend or separately.
- Complete local path or asset for the visual reference that was described only as `C:`.
