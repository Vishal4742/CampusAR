# CampusAR Backend, Database, And API Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

This is a planning document for the WSL Codex session. It does not create Node.js, PostgreSQL, migration, or build-tool scaffolding.

## Ownership

Primary owner: WSL Codex session.

Reason: backend, PostgreSQL/PostGIS, sync, and API work will be easier to develop and test from WSL once implementation is explicitly approved.

Current scope:

- Backend responsibility boundaries.
- PostgreSQL/PostGIS planning model.
- API surface planning.
- Sync, relay, WebSocket, admin, privacy, and safety contracts.
- Open questions that must be answered before implementation.

Related Phase 1 implementation plan: `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`.

CLI 2 Phase 1 status: complete for the dependency-free backend/data/admin scaffold. Production framework, TypeScript, PostgreSQL connection, migration tooling, and provider integrations remain open.

## Backend Responsibilities From SRS

- Authentication and registration for visitor, student, staff/faculty, verified mapper, and admin users.
- College email OTP verification for student and staff accounts.
- Admin-only admin account creation.
- Seven-day cooldown enforcement before new accounts can contribute map data.
- JWT-secured HTTPS API access.
- Campus map data storage and sync.
- Location verification, voting, feedback, correction, flagging, dispute, approval, and map-lock workflows.
- Delta sync and packet deduplication for offline relay uploads.
- Real-time buddy tracking through WebSocket without server persistence.
- Real-time SOS nearby-user notification for online users within 200 meters.
- Faculty availability status with automatic 4-hour expiry.
- Anonymous occupancy aggregation and heatmap data updated every 60 seconds.
- Admin dashboard data access for approvals, disputes, thresholds, roles, map lock, and heatmap.

## Backend Boundaries

The backend should be the canonical authority for:

- User identity, verification, roles, and contribution cooldown.
- Approved campus map data.
- Admin decisions, verification thresholds, disputes, and map lock state.
- Sync cursors, server-side deduplication, and accepted relay packets.
- Faculty availability status.
- Anonymous occupancy aggregates.
- Gamification totals, badges, streaks, and leaderboard views.
- Admin notices pinned to locations.

The backend should not persist:

- Buddy tracking location history.
- Raw individual location traces used to compute occupancy, unless a privacy-preserving retention rule is later approved.
- Local SOS contact numbers, because the SRS requires encrypted local storage for contacts.

## Conceptual Database Domains

These are planning domains, not final table names.

| Domain | Planned data |
| --- | --- |
| Users and roles | User identity, role, designation, verification state, department, cooldown start, account deletion state |
| Auth verification | OTP requests, verification attempts, expiry, college email metadata |
| Campus geometry | Campus geofence, buildings, floors, zones, rooms, location nodes, path edges |
| Map verification | Confirmations, corrections, feedback, flags, disputes, admin decisions, thresholds |
| Sync | Sync cursors, changed records, relay packet hashes, packet acceptance state |
| Occupancy | Anonymous zone aggregates and heatmap snapshots |
| Safety | SOS event metadata for online nearby notification, without local contact persistence |
| Faculty | Faculty/staff availability status, room association, expiry |
| Gamification | Points ledger, badges, streaks, leaderboard rollups |
| Notices | Admin-pinned notices with location radius and expiry if needed |
| Audit | Admin actions that change roles, map lock, thresholds, approvals, disputes, or location data |

## PostGIS Planning Notes

Use PostgreSQL with PostGIS for server-side spatial operations required by the SRS:

- Campus geofence checks for buddy tracking stop behavior.
- Location proximity checks for confirmation radius, default 15 meters.
- Nearby-user query for SOS online notification within 200 meters.
- Admin dashboard spatial views for locations, disputes, and heatmap zones.
- Zone lookup for occupancy aggregation.
- Optional spatial validation of paths, nodes, and floor/building containment.

Local app navigation remains offline-first and should not depend on live PostGIS route calculation. A* pathfinding belongs to the cached graph and Rust native engine per SRS.

## Candidate API Surface

Endpoint names are planning placeholders. Final paths should be decided during implementation.

### Auth And Users

- Register visitor.
- Register student or staff with college email, roll number or designation, and OTP flow.
- Verify OTP.
- Login and refresh JWT.
- Fetch current profile, roles, verification state, and contribution cooldown.
- Request account deletion.
- Admin creates or promotes admin users.

### Campus Map And Navigation Data

- Fetch map manifest and sync cursor.
- Fetch changed buildings, floors, zones, locations, edges, thresholds, and notices since cursor.
- Fetch offline tile manifest or tile metadata, depending on final map SDK.
- Submit path walk-count updates.
- Fetch QR anchor metadata.

### Crowdsourced Mapping

- Submit new location node.
- Submit new path edge.
- Confirm existing location.
- Submit correction.
- Submit feedback: wrong label, moved, closed, inaccessible.
- Flag location.
- Fetch user's contribution status and pending submissions.

### Sync And Relay

- Submit local delta batch.
- Submit relay packet batch on behalf of offline devices.
- Check packet hash acceptance or duplicate state.
- Fetch server deltas since last sync.
- Resolve server-side conflict outcomes.

### Admin Dashboard

- List pending locations, disputes, flags, corrections, and conflicting labels.
- Approve, reject, edit, suspend, or override locations.
- Lock or unlock mapping phase.
- Configure confirmation thresholds by location category.
- Manage roles and verified mappers.
- View occupancy heatmap.
- Pin or remove location notices.

### Live Features

- WebSocket channel for buddy tracking presence, with no persistence.
- WebSocket or push path for SOS nearby online alerts.
- Faculty availability set, fetch, and expiry behavior.
- Occupancy aggregate update publishing.

### Gamification

- Fetch points, badges, streaks, and leaderboard.
- Record eligible reward events after server validation.
- Fetch weekly and all-time leaderboard filtered by department.

## Sync Contract Planning

The SRS requires delta sync, offline queueing, relay deduplication, 512-byte BLE chunking on device, and multi-hop relay.

Backend sync should plan for:

- Monotonic sync cursors or server change tokens.
- Record-level change metadata.
- Idempotent writes from mobile clients and relay devices.
- Packet hashes for duplicate rejection.
- Device-independent relay acceptance so Device C can upload Device A data.
- Explicit server response for accepted, duplicate, rejected, and conflict states.
- Conflict records visible to admin when user-submitted map data cannot be safely merged.

Open question: exact conflict policy for delayed offline contributions after map lock, admin rejection, or newer edits.

## Privacy And Safety Rules

- Buddy tracking must be broadcast-only and never persisted on server.
- Occupancy heatmap output must be anonymous so no individual user location can be derived.
- SOS contacts remain encrypted in local app storage and are not a backend domain.
- Account deletion must remove user account and associated contribution data as required by SRS.
- Admin and map approval actions should have an audit trail, subject to institutional policy.

Open question: minimum aggregation threshold for occupancy zones.

## Phase 1 Backend Planning Deliverables

Before implementation, WSL Codex should finish:

- API boundary decisions for auth, map manifest, delta sync, admin approval, and role management.
- Conceptual database model review against SRS requirements.
- Backend hosting and provider assumptions list.
- OTP/email provider decision.
- Initial seed data ingestion plan for campus geofence, buildings, floors, locations, and path graph.
- API security baseline: HTTPS, JWT, admin role checks, cooldown enforcement.

## Open Questions

- What is the official OCT college email domain for student and staff OTP?
- Which OTP/email provider is approved?
- Which backend Node.js framework should be used when implementation begins?
- What hosting environment, domain, TLS certificate, SMS provider, push provider, and email provider are approved?
- What seed campus data exists and what format is it in?
- What are the exact location categories and confirmation thresholds?
- What audit logs are institutionally required for admin actions?
- What privacy threshold is required before publishing occupancy heatmap data?
- What retention rules apply to SOS event metadata?
- How should account deletion interact with previously approved map contributions?
- What conflict policy should apply to offline contributions that arrive late?
