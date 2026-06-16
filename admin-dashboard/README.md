# CampusAR Admin Dashboard

Owner: active backend/data/admin task.

This is the React + Vite + TypeScript admin dashboard scaffold for CampusAR.

Visual direction is captured in `VISUAL_DIRECTION.md`.

## Commands

```powershell
npm install --include=dev
npm run dev
npm run build
```

Default local backend URL: `http://localhost:8080`.

## Current Scaffold

The app currently includes:

- A Vite build step with strict TypeScript checking.
- A dark campus signal-console app shell matching `VISUAL_DIRECTION.md`.
- Compact route tabs for `Signal`, `Review`, and `Operators`.
- A map-first spatial review surface with OCT provisional coordinate/status language.
- Admin login via `POST /api/v1/auth/login` with `{ "email": "..." }`.
- Access-token persistence in local storage.
- Bearer-token requests to `GET /api/v1/me`.
- Status readouts for `GET /health`, role, verification state, and auth state.

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
- Phase 2 fingerprint coverage view for WiFi RSSI, magnetic samples, QR anchors, and floor profiles.

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
