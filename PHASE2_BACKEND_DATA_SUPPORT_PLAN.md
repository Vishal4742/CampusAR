# Phase 2 Backend/Data Support Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

Owner: active Codex session for backend/data/admin work.

Status: backend/data support slice implemented in the Fastify in-memory scaffold, with a draft Phase 2 persistence migration recorded. No Android, Rust, PostgreSQL connection, applied database migration, or React admin dashboard implementation is included.

## Boundary

Backend/data/admin support contracts for Phase 2 cover:

- Field survey JSON validate/import contract for controlled OCT bootstrap mapping data from Android.
- WiFi RSSI fingerprint storage and sync contracts.
- Magnetic fingerprint storage and sync contracts.
- QR anchor metadata contracts.
- Indoor floor, floor-transition, and barometer profile metadata.
- Admin review queues for Phase 2 mapping data.

This backend/data/admin slice does not include:

- Kotlin sensor collection implementation.
- Rust EKF, PDR, pathfinding, or floor-detection engine logic.
- JNI/FFI payload implementation.
- Android UI or permission flows.
- Physical placement of QR anchors.

## Active Backlog IDs

| ID | Backend/Data/Admin Role |
| --- | --- |
| `P2-04` | Define backend contract for WiFi RSSI fingerprint format and verified mapper collection workflow. |
| `P2-05` | Define backend contract for magnetic fingerprint format and fallback data lifecycle. |
| `P2-06` | Define backend metadata needed by barometer/no-barometer floor strategies. |
| `P2-07` | Define QR anchor data contract and admin approval state. |
| `P2-11` | Keep Phase 2 docs and git checkpoints current. |

`P2-01`, `P2-02`, `P2-03`, `P2-08`, `P2-09`, and `P2-10` remain primarily mobile/native responsibilities, though they may consume the backend contracts.

## Phase 2 Assumptions

- OCT remains the initial campus entity: `oct-bhopal`.
- Real building, floor, QR, WiFi, magnetic, stair, lift, and path data are not available yet.
- All Phase 2 spatial data must support `unknown`, `provisional`, `verified`, and `rejected` coordinate states.
- Android must be able to operate with empty fingerprint datasets and fall back gracefully.
- Backend stores authoritative approved datasets and accepts mapper-collected candidate samples for review.
- Raw individual movement traces should not be stored as normal location history.

## Data Domains

### Indoor Floor Metadata

Purpose: give Android/Rust stable building/floor identifiers and floor transition metadata.

Contract fields:

- `campusId`
- `buildingId`
- `floorId`
- `floorLabel`
- `floorIndex`
- `altitudeHintMeters`: nullable
- `barometerProfileId`: nullable
- `mapVersion`
- `verificationStatus`
- `updatedAt`

Open question: whether floor coordinates use WGS84 geometry, local building coordinates, or both.

### Floor Transitions

Purpose: represent stairs, lifts, ramps, and cross-floor graph links.

Contract fields:

- `id`
- `campusId`
- `buildingId`
- `fromFloorId`
- `toFloorId`
- `locationId`
- `transitionType`: `stairs`, `lift`, `ramp`, `unknown`
- `wheelchairAccessible`: `true`, `false`, `unknown`
- `coordinateStatus`
- `verificationStatus`

### QR Anchors

Purpose: provide exact snap points for drift reset and floor correction.

Contract fields:

- `id`
- `campusId`
- `buildingId`
- `floorId`
- `locationId`
- `codeKey`
- `snapPoint`: nullable until placed and surveyed
- `coordinateStatus`
- `verificationStatus`
- `active`
- `placedBy`
- `approvedBy`
- `updatedAt`

Do not generate final QR anchor coordinates until physical QR placement is approved.

### WiFi RSSI Fingerprints

Purpose: provide fallback positioning data when GPS is weak or indoor.

Collection payload should use a session envelope:

- `sessionId`
- `campusId`
- `buildingId`
- `floorId`
- `locationId`: nullable
- `position`: nullable or provisional
- `coordinateStatus`
- `deviceModel`
- `androidSdk`
- `collectedAt`
- `readings`

Reading contract:

- `bssidHash`
- `ssidLabel`: optional and redacted unless needed
- `rssiDbm`
- `frequencyMhz`
- `channel`: optional
- `scanAgeMs`: optional

Privacy rule: prefer salted or keyed hashes for BSSID values instead of storing raw BSSIDs in public APIs. Raw BSSID storage, if needed server-side, requires explicit approval.

### Magnetic Fingerprints

Purpose: provide magnetic fallback data where WiFi RSSI is weak or unstable.

Collection payload:

- `sessionId`
- `campusId`
- `buildingId`
- `floorId`
- `locationId`: nullable
- `position`: nullable or provisional
- `coordinateStatus`
- `deviceModel`
- `sensorVendor`: optional
- `collectedAt`
- `samples`

Sample contract:

- `magneticXMicroTesla`
- `magneticYMicroTesla`
- `magneticZMicroTesla`
- `magnitudeMicroTesla`
- `headingDegrees`: optional
- `quality`: `raw`, `calibrated`, `rejected`

Open question: whether Android/Rust wants magnetic vectors in device frame, world frame, or both.

### Barometer Floor Profiles

Purpose: support floor switching and graceful fallback for devices with or without barometers.

Contract fields:

- `id`
- `buildingId`
- `floorId`
- `referencePressureHpa`: nullable
- `relativeAltitudeMeters`: nullable
- `sampleCount`
- `seasonOrWeatherNote`: nullable
- `verificationStatus`
- `updatedAt`

Barometer data must be treated as calibration support, not as an authoritative floor result by itself.

## Implemented API Contracts

Read endpoints for Android cache:

- `GET /api/v1/map/floors`
- `GET /api/v1/map/qr-anchors`
- `GET /api/v1/map/fingerprints/wifi?campusId=&buildingId=&floorId=`
- `GET /api/v1/map/fingerprints/magnetic?campusId=&buildingId=&floorId=`
- `GET /api/v1/map/floor-profiles?buildingId=`

Mapper upload endpoints:

- `POST /api/v1/mapping/fingerprint-sessions`
- `POST /api/v1/mapping/fingerprints/wifi`
- `POST /api/v1/mapping/fingerprints/magnetic`
- `POST /api/v1/mapping/barometer-samples`
- `POST /api/v1/mapping/qr-anchors`

Admin endpoints to plan:

- `POST /api/v1/admin/survey-imports/validate`
- `POST /api/v1/admin/survey-imports`
- `GET /api/v1/admin/fingerprint-sessions`
- `POST /api/v1/admin/fingerprint-sessions/:id/approve`
- `POST /api/v1/admin/fingerprint-sessions/:id/reject`
- `GET /api/v1/admin/qr-anchors`
- `POST /api/v1/admin/qr-anchors/:id/approve`

Implementation notes:

- Storage is in-memory and exists to lock the contracts for Android/Rust consumption.
- Public map reads expose only approved/verified WiFi fingerprints, magnetic fingerprints, and active QR anchors.
- Mapper upload routes require `verified_mapper` or `admin`.
- Admin review routes require `admin`.
- Survey imports normalize mobile `field_collected` coordinates into backend `provisional` records with `pending_admin_review` status.
- `since` filtering is intentionally deferred until the PostgreSQL/PostGIS sync model is connected.

## Admin Dashboard Phase 2 Preparation

The admin dashboard should extend the signal-console direction with:

- floor selector
- fingerprint coverage layer
- QR anchor placement/review layer
- confidence and sample-density overlays
- mapper session queue
- status strip for `graph sparse`, `fingerprints sparse`, `qr anchors missing`, and `floor profile unknown`

Do not use generic dashboard cards. Keep the map-first operational console language from `admin-dashboard/VISUAL_DIRECTION.md`.

## Acceptance Criteria For Backend/Data/Admin Slice

- Phase 2 backend/data scope is recorded in `CODEX_HANDOFF.md`.
- Backlog shows backend/data Phase 2 support items as implemented or closed.
- Database notes identify required Phase 2 domains.
- API plan lists Android-facing and admin-facing contracts.
- Backend check/test/build commands pass.
- No Android or Rust files are edited as part of this backend/data/admin slice.

## Blockers

- No verified OCT building/floor dataset.
- No approved QR anchor placement list.
- No verified WiFi scan collection procedure.
- No magnetic fingerprint collection procedure.
- No decision on raw versus hashed BSSID storage.
- No decision on local coordinate system versus WGS84-only indoor geometry.
- No production PostgreSQL/PostGIS target.
- Phase 2 persistence migration is drafted but not reviewed or applied to a real database.
