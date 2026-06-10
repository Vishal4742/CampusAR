# CampusAR Map And Sync Contract

Owner: CLI 2, WSL Codex.

Status: shared backend-to-Android planning contract. Current backend scaffold may expose a smaller in-memory shape until PostgreSQL/PostGIS is connected.

Base path: `/api/v1`

## Shared Rules

- OCT is the initial campus: `oct-bhopal`.
- Approximate OCT center is latitude `23.2462927`, longitude `77.5019383`.
- The center is `provisional`; it is not a verified destination or route node.
- Unknown coordinates must be returned as `null` and marked with `coordinateStatus: "unknown"`.
- Provisional coordinates must be marked with `coordinateStatus: "provisional"`.
- Android must not assume a complete graph until `sparseMap` is `false` and a published map version exists.
- Live backend routing is out of scope; Android/Rust should compute routes from cached `locations` and `edges`.

## `GET /sync/manifest`

Purpose: let Android decide whether cached map data is stale and whether the current map is sparse.

Target response shape:

```json
{
  "campus": {
    "id": "uuid",
    "stableKey": "oct-bhopal",
    "name": "Oriental College of Technology",
    "center": {
      "latitude": 23.2462927,
      "longitude": 77.5019383,
      "coordinateStatus": "provisional",
      "sourceUrl": "https://maps.app.goo.gl/PoESLVac4tegAM489"
    },
    "geofenceStatus": "unknown"
  },
  "mapVersion": {
    "id": "uuid",
    "version": 1,
    "status": "draft",
    "publishedAt": null
  },
  "latestChangeId": 0,
  "mappingLocked": false,
  "sparseMap": true,
  "counts": {
    "buildings": 0,
    "gates": 0,
    "landmarks": 0,
    "locations": 0,
    "edges": 0,
    "qrAnchors": 0
  }
}
```

Manifest status rules:

- `mapVersion.status = draft` means data may be useful for testing but should not be treated as production navigation truth.
- `sparseMap = true` means Android should show partial-map states and avoid promising full campus routes.
- `latestChangeId` is the cursor for `/sync/changes`.

## `GET /map/locations`

Purpose: provide Android a location-node cache for display, search, graph anchors, and future route endpoints.

Target response shape:

```json
{
  "campusId": "uuid",
  "mapVersion": 1,
  "locations": [
    {
      "id": "uuid",
      "stableKey": "oct-center",
      "categoryKey": "campus_center",
      "label": "Oriental College of Technology",
      "position": {
        "latitude": 23.2462927,
        "longitude": 77.5019383
      },
      "coordinateStatus": "provisional",
      "verificationStatus": "draft",
      "buildingId": null,
      "floorId": null,
      "zoneId": null,
      "confidenceScore": 0,
      "source": {
        "type": "google_maps_link",
        "url": "https://maps.app.goo.gl/PoESLVac4tegAM489"
      },
      "updatedAt": "2026-06-11T00:00:00.000Z"
    }
  ]
}
```

Location category keys reserved for Android:

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

Android handling rules:

- `position` may be `null`.
- `coordinateStatus` must be checked before using a location for navigation.
- `verificationStatus` may be `draft`, `pending_confirmation`, `pending_admin_review`, `verified`, `suspended`, `rejected`, or `expired`.
- Search and UI may show draft/provisional records with a clear status, but route computation should prefer verified graph nodes when available.

## `GET /map/edges`

Purpose: provide Android/Rust an offline path graph separate from display locations.

Target response shape:

```json
{
  "campusId": "uuid",
  "mapVersion": 1,
  "edges": [
    {
      "id": "uuid",
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "geometry": [
        { "latitude": 23.2462927, "longitude": 77.5019383 },
        { "latitude": 23.2463000, "longitude": 77.5019500 }
      ],
      "coordinateStatus": "provisional",
      "verificationStatus": "draft",
      "edgeType": "outdoor_walkway",
      "bidirectional": true,
      "distanceMeters": null,
      "floorTransitionType": null,
      "wheelchairAccessible": "unknown",
      "confidenceScore": 0,
      "walkCount": 0,
      "updatedAt": "2026-06-11T00:00:00.000Z"
    }
  ]
}
```

Edge handling rules:

- `geometry` may be `null` until a path is walked or imported from a verified source.
- `distanceMeters` may be `null`; Android/Rust may compute distance when geometry is verified.
- `wheelchairAccessible` must support `true`, `false`, and `unknown`.
- Edges must not reference missing locations.
- Android should tolerate an empty `edges` array and show an incomplete-map state.

## Versioning And Cache Invalidation

- Android should cache `locations` and `edges` by `campusId` and `mapVersion`.
- A higher `latestChangeId` means Android should call `/sync/changes`.
- A new published map version may invalidate graph assumptions and should trigger a cache refresh.

## Open Contract Questions

- Final naming for `verificationStatus` versus existing `status` fields.
- Whether Android wants GeoJSON points/LineStrings or the explicit `{ latitude, longitude }` arrays shown here.
- Whether `mapVersion` should be numeric only or include a stable UUID in every payload.
- Whether draft/provisional records should be hidden by default in student-facing navigation.
