# CampusAR Database Schema Notes

Owner: CLI 2, WSL Codex.

Status: Phase 1 schema draft in `migrations/001_phase1_foundation.sql`.

## Current Coverage

The Phase 1 SQL migration covers:

- `app_users`
- `user_role_assignments`
- `otp_challenges`
- `campuses`
- `buildings`
- `floors`
- `zones`
- `location_categories`
- `locations`
- `path_edges`
- `qr_anchors`
- `map_settings`
- `location_confirmations`
- `sync_changes`
- `sync_cursors`
- `relay_packet_hashes`
- `admin_audit_events`

## PostGIS Usage

Spatial columns are included for:

- Campus geofence polygons.
- Building footprints and centroids.
- Occupancy zone boundaries.
- Location points.
- Path edge lines.
- QR anchor snap points.

These support SRS requirements for confirmation radius checks, SOS nearby-user queries, campus geofence behavior, occupancy zones, and admin spatial views.

## Review Needed Before Applying

- Confirm whether indoor floor coordinates should use WGS84 geometry, local projected coordinates, or both.
- Confirm canonical campus geofence.
- Convert the current Google Maps pins into approved seed data only after institutional review.
- Add or confirm nullable/provisional geometry support before applying the schema. OCT buildings, gates, landmarks, paths, and QR anchors currently have unknown coordinates and must not be forced into fake points or lines.
- Add `map_versions` or an equivalent version table before publishing offline map snapshots to Android.
- Add stable keys for campus, map versions, buildings, locations, and edges so Android cache records remain stable across sync.
- Confirm initial location categories and thresholds.
- Confirm account deletion policy for approved map contributions.
- Confirm audit retention policy.
- Confirm migration tool and naming convention.

## Known Deferrals

- Occupancy aggregate tables are deferred to Phase 5.
- Buddy WebSocket presence is intentionally not persisted.
- Faculty availability is deferred to Phase 6.
- Gamification ledger is deferred to Phase 6.
- Full dispute and approval workflow tables are expanded in Phase 3.
