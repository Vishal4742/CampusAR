# CampusAR Database Schema Notes

Owner: CLI 2, WSL Codex.

Status: Phase 1 schema draft in `migrations/001_phase1_foundation.sql`; Phase 2 sensor-support persistence target in `migrations/002_phase2_sensor_support.sql`.

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

The Phase 2 SQL migration adds or extends:

- `coordinate_status`
- `fingerprint_kind`
- `fingerprint_sessions`
- `wifi_fingerprints`
- `magnetic_fingerprints`
- `barometer_samples`
- `floor_profiles`
- `qr_anchors` proposal/review metadata

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

## Phase 2 Data Domains To Add Before Persistence

The backend now has in-memory Phase 2 contract support for these domains, and `002_phase2_sensor_support.sql` records the proposed PostgreSQL/PostGIS persistence target. It still needs review before migrations are applied:

- Indoor floor metadata with nullable altitude hints and stable floor IDs.
- Floor transitions for stairs, lifts, ramps, and cross-floor graph links.
- QR anchor placement and approval state.
- WiFi RSSI fingerprint collection sessions and readings.
- Magnetic fingerprint collection sessions and samples.
- Barometer floor profiles by building/floor.
- Admin review state for fingerprint sessions and QR anchor placements.
- Field survey imports currently target existing `locations` and `path_edges` records as provisional pending-review map data. A separate import batch table can be added later if admin audit/reporting needs it.

Open schema decisions:

- Raw BSSID storage versus salted/keyed BSSID hashes.
- WGS84-only indoor geometry versus local building coordinate system plus WGS84 anchors.
- Whether fingerprint datasets are published by map version or by independent calibration version.
- Minimum sample density before fingerprints are exposed to Android.
