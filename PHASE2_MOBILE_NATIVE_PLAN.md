# Phase 2 Mobile And Native Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0, plus Phase 1 implementation results and OCT mapping constraints.

Owner: active Codex session for mobile/native work.

Status: Phase 2 mobile/native slice is implemented for field survey, Android sensor scaffold, and Rust sensor/PDR primitives. Full EKF, indoor positioning, QR snapping, WiFi/magnetic fingerprinting, Room map cache, and backend upload remain deferred.

## Phase 2 Purpose

Phase 2 has two tracks:

1. Sensor-fusion foundation from the SRS: Kotlin sensor collection, Rust positioning primitives, heading smoothing, graceful sensor fallback, QR-anchor planning, and the native contract needed for later indoor navigation.
2. Practical OCT field-survey bootstrap: a mobile-only survey mode that can save campus GPS points and walked route segments locally, then export JSON for backend seed import.

The survey track is not the final crowdsourced mapping workflow. It is a controlled data collection utility to solve the current blocker: there is no verified OCT campus dataset.

## Current Inputs

- Phase 1 Android app builds and contains GPS location flow, seed destination loading, Kotlin-to-Rust JNI calls, and a compass-style `SurfaceView` overlay.
- Phase 1 Rust native engine builds for `arm64-v8a` and `armeabi-v7a` and has distance, bearing, heading delta, proximity, and arrival tests.
- OCT campus center reference is provisional: latitude `23.2462927`, longitude `77.5019383`.
- Backend map contract is documented in `backend/MAP_SYNC_CONTRACT.md`.
- Visual direction is dark operational campus signal UI: sparse chrome, mono labels, warm horizon gradient, film grain, coordinate/status language, and subtle amber/orange active accents.

## Mobile/Native Boundary

Mobile/native work may plan and later implement, after explicit approval:

- `android-app/`
- `native-engine/`
- mobile/native planning docs
- Android survey-mode UI and local export
- Kotlin sensor collection and native sensor contract
- Rust positioning primitives and tests
- mobile-side consumption of backend map contracts

Mobile/native work must not edit:

- `backend/`
- `database/`
- `admin-dashboard/`

Shared API or seed contract changes must be proposed through `CODEX_HANDOFF.md` before implementation.

## Backend/Data/Admin Coordination

Backend/data/admin work may separately handle:

- JSON import contract for survey exports
- backend seed validation rules
- database schema alignment for provisional coordinates
- admin dashboard planning for map review and approval
- mock responses for `/api/v1/sync/manifest`, `/api/v1/map/locations`, and `/api/v1/map/edges`

Backend/data/admin work must not edit Android or Rust implementation files.

## Phase 2 Work Packages

| ID | Area | Plan |
| --- | --- | --- |
| M2-01 | Survey data model | Done: added local `SurveyPoint`, `SurveyRoute`, and `SurveyExport` models compatible with backend seed import. |
| M2-02 | Survey UI | Done: added field tool for save current GPS point, category/notes, start route, stop route, summary, clear, and export JSON. |
| M2-03 | Local persistence | Done: survey data is stored in app-private JSON through `SurveyRepository`; Room remains deferred. |
| M2-04 | Export/share | Done: exports `campusar_survey_<timestamp>.json` through Android document creation flow. |
| M2-05 | Sensor contract | Done: added Android sensor source for accelerometer, gyroscope, magnetometer, optional barometer, timestamp, elapsed time, accuracy, and XYZ values. |
| M2-06 | Rust sensor primitives | Done: added native modules for heading smoothing, motion classification, step length, step detection, and dead-reckoning deltas with unit tests. |
| M2-07 | Fallback matrix | Done for current slice: app tolerates missing optional sensors, unavailable native library, denied location, and sparse survey data. |
| M2-08 | Map contract consumer | Deferred: backend contract exists, but Android cache models and endpoint consumer are not implemented in this slice. |
| M2-09 | Visual pass | Partial: survey screen uses the dark operational signal direction; full visual polish is deferred until map/survey flows stabilize. |
| M2-10 | Handoff | Pending shared-doc reconciliation after backend/data work finishes. |

## Survey Mode MVP

The first useful Phase 2 mobile slice should support:

- Show current GPS latitude, longitude, provider status, and accuracy when Android exposes it.
- Save current point with:
  - local ID such as `P001`
  - label
  - category: `gate`, `building`, `building_entrance`, `landmark`, `path_node`, `canteen`, `parking`, `junction`, `other`
  - latitude
  - longitude
  - accuracy meters if available
  - notes
  - timestamp
  - `coordinateStatus: "field_collected"`
- Start and stop a walked route with:
  - local ID such as `R001`
  - optional from/to point labels
  - sampled GPS points
  - distance estimate
  - notes
  - timestamp
  - route type: `outdoor_walkway` by default
- Export a single JSON file that backend/data/admin import tooling can transform into seed data.

Out of scope for the survey MVP:

- photos
- login
- backend upload
- admin approval in the app
- indoor room graph
- automatic floor switching
- full EKF/PDR positioning
- public crowdsourced mapping

## Proposed Survey Export Shape

```json
{
  "schemaVersion": 1,
  "campusStableKey": "oct-bhopal",
  "collectedBy": "manual-field-survey",
  "deviceTimeZone": "Asia/Calcutta",
  "exportedAt": "2026-06-11T00:00:00.000Z",
  "points": [
    {
      "localId": "P001",
      "label": "Main Gate",
      "categoryKey": "gate",
      "position": {
        "latitude": 23.2462927,
        "longitude": 77.5019383,
        "accuracyMeters": 8.0
      },
      "coordinateStatus": "field_collected",
      "notes": "Main road entry",
      "capturedAt": "2026-06-11T00:00:00.000Z"
    }
  ],
  "routes": [
    {
      "localId": "R001",
      "label": "Main Gate to Library",
      "edgeType": "outdoor_walkway",
      "fromLocalPointId": "P001",
      "toLocalPointId": "P002",
      "geometry": [
        {
          "latitude": 23.2462927,
          "longitude": 77.5019383,
          "accuracyMeters": 8.0,
          "capturedAt": "2026-06-11T00:00:00.000Z"
        }
      ],
      "notes": "Straight path, no stairs",
      "capturedAt": "2026-06-11T00:00:00.000Z"
    }
  ]
}
```

## Sensor Contract Draft

Kotlin should collect Android sensor events and normalize them before crossing JNI:

| Field | Type | Notes |
| --- | --- | --- |
| `timestampNanos` | `Long` | Android event timestamp, monotonic. |
| `sensorType` | enum/int | Accelerometer, gyroscope, magnetometer, barometer. |
| `x`, `y`, `z` | `Float` | Sensor values; pressure may use `x` only. |
| `accuracy` | `Int` | Android sensor accuracy when available. |
| `elapsedRealtimeNanos` | `Long` | Optional receive time for latency checks. |

Initial JNI should use small primitive batches or direct buffers. Avoid per-event object-heavy JNI calls when moving toward 50 Hz fusion.

## Rust Phase 2 Native Shape

Planned modules:

```text
native-engine/src/
  sensors/
    mod.rs
    heading.rs
    motion.rs
    pdr.rs
  navigation/
    bearing.rs
    graph.rs
  mapping/
    survey.rs
```

Near-term Rust work should focus on deterministic, testable primitives:

- heading normalization and smoothing
- magnetometer/gyro heading blending plan
- motion-state classification from recent acceleration magnitude
- step detection test cases from synthetic input
- graph data structs that can later power A*

Full EKF, WiFi fingerprint correction, magnetic fingerprint database, and QR snap behavior should remain planned until enough field data and local storage decisions exist.

## Android Visual Direction

When UI work starts, avoid generic dashboard/card-heavy screens. Apply the reference as:

- black/dark base
- warm amber/orange active accent
- low-opacity white text
- mono labels for coordinates, status, IDs, and telemetry
- one expressive serif only for major place/destination names if practical on Android
- edge-aligned status chrome
- sparse map/survey controls
- no decorative cards inside cards

Survey mode should still be practical outdoors: high contrast, large tap targets, readable in daylight, and tolerant of walking use.

## Acceptance Criteria For First Phase 2 Slice

Survey-mode slice is acceptable when:

- APK builds locally.
- Device can show current GPS values after permission.
- User can save at least one point with label, category, notes, and coordinates.
- User can record at least one route geometry.
- Survey data survives app restart.
- User can export or share JSON.
- Export parses as valid JSON.
- `CODEX_HANDOFF.md` records export location, sample shape, and backend import expectations.

Sensor-planning slice is acceptable when:

- Kotlin/Rust sensor contract is documented.
- Rust primitives have unit tests.
- No hot path uses object-heavy JNI by default.
- Missing optional sensor behavior is documented.

## Phase 2 Mobile/Native Closeout Status

| Criterion | Status | Evidence |
| --- | --- | --- |
| Field survey UI exists | Done | `MainActivity.kt` includes point capture, route capture, survey summary, clear, and export controls |
| Survey data model exists | Done | `SurveyModels.kt` defines points, routes, route samples, and export metadata |
| Survey persistence exists | Done | `SurveyRepository.kt` stores and reloads app-private JSON |
| JSON export exists | Done | `ACTION_CREATE_DOCUMENT` export writes `campusar_survey_<timestamp>.json` |
| GPS accuracy/timestamp captured | Done | `GeoPoint.kt` and `GpsLocationSource.kt` include accuracy and capture time |
| Android sensor contract exists | Done | `DeviceSensorSource.kt` and `SensorModels.kt` normalize accelerometer, gyro, magnetometer, and barometer readings |
| Native sensor primitives exist | Done | `native-engine/src/sensors/` includes heading, motion, and PDR modules |
| Primitive JNI sensor contract exists | Done | `ffi/mod.rs` exposes heading smoothing, motion state, step length, and dead-reckoning functions |
| Full EKF/PDR positioning loop | Deferred | Requires more field data, local storage boundary, and sampling strategy validation |
| Backend survey upload/import | Backend/data/admin slice | Android exports JSON only in this slice |

## Open Questions

- Should survey export use Android share sheet in addition to the current document export?
- When should survey data move from app-private JSON to Room?
- What point categories should be locked for OCT mapping walks?
- How frequently should route GPS points be sampled beyond the current 3-meter distance threshold?
- Should the first survey route simplify geometry on device or leave raw points for backend cleanup?
- When should Android consume backend map/sync endpoints?
