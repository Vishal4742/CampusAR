# OCT Seed Data Contract

Owner: CLI 2, WSL Codex.

Status: planning contract. Do not treat this as verified campus geometry.

## P1-06 Status

The OCT initial campus entity and provisional center are recorded (closes backlog item P1-06). The contract below, the source links in `source-links.json` (with `userConfirmedNoCampusDataset: true`), and the runtime seed in `backend/src/services/store.ts` `seedCampus()` together materialize the `oct-bhopal` campus with provisional center `23.2462927, 77.5019383` (`coordinate_status: provisional`, `geofence_status: unknown`, map version `1` / `draft`) and two provisional `campus_pin` locations. Recorded as of 2026-06-15.

Verified campus geometry — geofence, building footprints, floor plans, path graph, room/stair/lift coordinates, QR-anchor placements, and WiFi/magnetic fingerprints — remains unknown and is deferred to Phase 3 crowdsourced mapping (backlog item P3-02, "verified mapper provisioning workflow, required because no existing campus dataset is available"). The provisional center is a draft outdoor reference point only.

## Initial Campus Entity

CampusAR should treat Oriental College of Technology as the initial campus entity.

| Field | Value |
| --- | --- |
| Stable key | `oct-bhopal` |
| Name | Oriental College of Technology |
| Institution | Oriental College of Technology, Bhopal |
| Approx center latitude | `23.2462927` |
| Approx center longitude | `77.5019383` |
| Source | `https://maps.app.goo.gl/PoESLVac4tegAM489` |
| Coordinate status | `provisional` |
| Geofence status | `unknown` |
| Initial map version | `1`, status `draft` |

The center coordinate is only a draft outdoor reference point. It is not a campus geofence, building footprint, gate coordinate, indoor coordinate, path edge, or verified destination.

## Coordinate Status Rule

Any spatial record must carry one of these statuses:

| Status | Meaning |
| --- | --- |
| `unknown` | Coordinate is not known and geometry must be `null`. |
| `provisional` | Coordinate came from a draft source or mapper walk and needs verification. |
| `verified` | Coordinate was confirmed and approved through the mapping workflow. |
| `rejected` | Coordinate was reviewed and rejected. |

Do not invent coordinates. Unknown building, gate, landmark, room, path, staircase, lift, and QR-anchor coordinates must remain `null` or `provisional` until verified.

## Seed Tables And Contracts

### `campuses`

Purpose: one row for OCT as the initial campus.

Required contract fields:

- `id`
- `stable_key`: `oct-bhopal`
- `name`
- `institution`
- `center_point`: provisional point, nullable if removed later
- `center_coordinate_status`: `provisional`
- `geofence`: nullable until verified
- `geofence_status`: `unknown`
- `active_map_version_id`
- `created_at`
- `updated_at`

### `map_versions`

Purpose: versioned map snapshots for offline Android cache and sync manifests.

Required contract fields:

- `id`
- `campus_id`
- `version_number`
- `status`: `draft`, `published`, `retired`
- `source_summary`
- `latest_change_id`
- `created_by`
- `published_by`
- `published_at`
- `created_at`

Initial OCT map version should be `1` and `draft`.

### `buildings`

Purpose: named building records that can later receive footprints, centroids, floors, and entrances.

Required contract fields:

- `id`
- `campus_id`
- `map_version_id`
- `stable_key`
- `name`
- `code`
- `footprint`: nullable until verified
- `centroid`: nullable until verified
- `coordinate_status`
- `verification_status`
- `source_summary`
- `created_at`
- `updated_at`

Do not create final OCT building coordinates until a mapper/admin verification pass exists.

### `locations`

Purpose: shared location-node table for gates, landmarks, building entrances, rooms, QR anchors, and navigation graph nodes.

Required contract fields:

- `id`
- `campus_id`
- `map_version_id`
- `building_id`
- `floor_id`
- `zone_id`
- `category_key`
- `stable_key`
- `label`
- `point`: nullable for unknown coordinates
- `coordinate_status`
- `verification_status`
- `confidence_score`
- `temporary_expires_at`
- `created_by`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

Initial categories should include:

- `campus_center`
- `building`
- `building_entrance`
- `gate`
- `landmark`
- `path_node`
- `room`
- `stair`
- `lift`
- `qr_anchor`

### Gates

Use `locations` rows with `category_key = gate`.

Additional gate metadata can be stored later as JSON or a `gate_details` table:

- `access_type`: pedestrian, vehicle, service, unknown
- `public_access`: true, false, unknown
- `security_note`: nullable
- `open_hours`: nullable

All gate coordinates are currently unknown unless verified on site.

### Landmarks

Use `locations` rows with `category_key = landmark`.

Landmark examples are admin office, reception, canteen, department office, lab, library, auditorium, parking, and common areas. These are examples only; do not seed final landmark coordinates before verification.

### `path_edges`

Purpose: offline navigation graph edges for Android/Rust pathfinding.

Required contract fields:

- `id`
- `campus_id`
- `map_version_id`
- `from_location_id`
- `to_location_id`
- `path`: nullable until walked or imported from verified source
- `coordinate_status`
- `edge_type`: outdoor_walkway, corridor, stairs, lift, road_crossing, unknown
- `bidirectional`
- `distance_meters`: nullable until computed from verified geometry
- `wheelchair_accessible`: true, false, unknown
- `confidence_score`
- `walk_count`
- `verification_status`
- `created_by`
- `created_at`
- `updated_at`

Do not create navigable edges between unverified locations as if they are final.

### `seed_source_links`

Purpose: record source links without converting them into verified geometry.

Required contract fields:

- `id`
- `campus_id`
- `label`
- `url`
- `resolved_name`
- `latitude`
- `longitude`
- `coordinate_status`
- `notes`
- `captured_at`

## Android Cache Contract

The backend should expose OCT map data to Android through:

- `GET /api/v1/sync/manifest`
- `GET /api/v1/map/locations`
- `GET /api/v1/map/edges`

The mobile app must tolerate:

- empty `locations`
- empty `edges`
- `position: null`
- `coordinateStatus: unknown`
- `mapVersion.status: draft`
- `sparseMap: true`

## Schema Review Before Applying

Before applying SQL migrations to a real database, review the current schema draft for nullable geometry support. Unknown OCT coordinates require nullable location, path, and QR-anchor geometry or an equivalent staging table. The production schema must not force fake coordinates just to satisfy `NOT NULL`.
