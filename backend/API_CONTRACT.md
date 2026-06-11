# CampusAR Backend API Contract

Owner: CLI 2, WSL Codex.

Status: CLI 2 Phase 1 scaffold and CLI 2 Phase 2 backend/data support slice are implemented with in-memory storage until PostgreSQL/PostGIS is connected.

Base path: `/api/v1`

Shared map/sync contract details for Android are in `MAP_SYNC_CONTRACT.md`.

## Auth

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `POST` | `/auth/register/visitor` | Create visitor account | None |
| `POST` | `/auth/register/verified` | Create student/staff/faculty account and OTP challenge | None |
| `POST` | `/auth/otp/request` | Request OTP for an existing account | None |
| `POST` | `/auth/otp/verify` | Verify OTP and issue tokens | None |
| `POST` | `/auth/login` | Issue tokens for a known verified account | None in scaffold |
| `POST` | `/auth/refresh` | Refresh token pair | Refresh token |
| `GET` | `/me` | Current user profile | Bearer access token |
| `DELETE` | `/me` | Mark account deleted | Bearer access token |

Visitor registration body:

```json
{
  "fullName": "Visitor One",
  "email": "optional@example.edu"
}
```

Verified registration body:

```json
{
  "fullName": "Student One",
  "email": "student@oriental.ac.in",
  "role": "student",
  "rollNumber": "OCT001",
  "department": "AIML"
}
```

## Map Bootstrap

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/sync/manifest` | Current map version, latest change id, entity counts | None |
| `GET` | `/map/buildings` | Building cache payload | None |
| `GET` | `/map/floors` | Floor cache payload | None |
| `GET` | `/map/locations` | Location node cache payload | None |
| `GET` | `/map/edges` | Path edge cache payload | None |
| `GET` | `/map/qr-anchors` | QR anchor cache payload | None |

Current map data is placeholder-only until OCT campus seed data is approved. The initial campus is Oriental College of Technology with stable key `oct-bhopal` and provisional center `23.2462927, 77.5019383`.

Android-facing contract notes:

- Full URLs are `/api/v1/sync/manifest`, `/api/v1/map/locations`, and `/api/v1/map/edges`.
- `/sync/manifest` should include campus identity, map version, latest change id, sparse-map state, mapping lock state, and entity counts.
- `/map/locations` should return category keys, labels, nullable positions, coordinate status, verification status, confidence, and source metadata.
- `/map/edges` should return graph edges separately from locations, with nullable geometry, coordinate status, verification status, accessibility state, confidence, and walk count.
- Android must tolerate empty arrays, `position: null`, `geometry: null`, `coordinateStatus: unknown`, and `sparseMap: true`.
- Do not treat provisional OCT coordinates as verified navigation destinations.

## Sync

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/sync/changes?since=0` | Delta changes after cursor | None |
| `POST` | `/sync/changes` | Submit local client changes | Bearer access token |
| `POST` | `/sync/relay-packets` | Submit relay packets on behalf of offline devices | Bearer access token |

Relay upload body:

```json
{
  "packets": [
    {
      "packetHash": "sha256-or-device-generated-hash",
      "payload": {
        "kind": "confirmation"
      }
    }
  ]
}
```

Relay result values:

- `accepted`
- `duplicate`
- `rejected`
- `conflict`

## Phase 2 Sensor-Support Contracts

These endpoints are implemented in the in-memory Fastify scaffold to lock contracts for Android/Rust integration. Persistence, `since` filtering, and PostGIS-backed review queries remain deferred.

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/map/fingerprints/wifi?campusId=&buildingId=&floorId=` | Download approved WiFi RSSI fingerprints for offline cache | None |
| `GET` | `/map/fingerprints/magnetic?campusId=&buildingId=&floorId=` | Download approved magnetic fingerprints for offline cache | None |
| `GET` | `/map/floor-profiles` | Download barometer/floor support metadata | None |
| `POST` | `/mapping/fingerprint-sessions` | Start a verified mapper collection session | Verified mapper/admin |
| `POST` | `/mapping/fingerprints/wifi` | Submit WiFi RSSI fingerprint samples | Verified mapper/admin |
| `POST` | `/mapping/fingerprints/magnetic` | Submit magnetic fingerprint samples | Verified mapper/admin |
| `POST` | `/mapping/barometer-samples` | Submit barometer floor profile samples | Verified mapper/admin |
| `POST` | `/mapping/qr-anchors` | Submit proposed QR anchor placement | Verified mapper/admin |

Fingerprint session body:

```json
{
  "campusId": "oct-bhopal",
  "buildingId": "provisional-main-block",
  "floorId": "ground",
  "locationId": null,
  "coordinateStatus": "provisional",
  "kind": "wifi_rssi",
  "deviceModel": "Redmi Note 10 Pro",
  "androidSdk": "35",
  "position": {
    "type": "Point",
    "coordinates": [77.5019383, 23.2462927],
    "source": "provisional_google_maps_pin"
  }
}
```

WiFi fingerprint body:

```json
{
  "sessionId": "uuid",
  "collectedAt": "2026-06-11T10:00:00.000Z",
  "readings": [
    {
      "bssidHash": "sha256:hash-only",
      "ssidLabel": "redacted",
      "rssiDbm": -58,
      "frequencyMhz": 2412,
      "scanAgeMs": 120
    }
  ]
}
```

QR anchors proposed through `/mapping/qr-anchors` are hidden from `/map/qr-anchors` until approved by admin.

Admin review endpoints for Phase 2:

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/admin/fingerprint-sessions` | List mapper fingerprint sessions and sample counts | Admin bearer token |
| `POST` | `/admin/fingerprint-sessions/:id/approve` | Mark session and attached samples verified | Admin bearer token |
| `POST` | `/admin/fingerprint-sessions/:id/reject` | Mark session and attached samples rejected | Admin bearer token |
| `GET` | `/admin/qr-anchors` | List proposed and approved QR anchors | Admin bearer token |
| `POST` | `/admin/qr-anchors/:id/approve` | Publish QR anchor for Android cache reads | Admin bearer token |

See `../PHASE2_BACKEND_DATA_SUPPORT_PLAN.md` for field-level planning.

## Admin

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/admin/users` | List users | Admin bearer token |
| `POST` | `/admin/admins` | Create admin account | Admin bearer token |
| `POST` | `/admin/users/:id/role` | Assign role | Admin bearer token |
| `GET` | `/admin/audit` | List admin audit events | Admin bearer token |
| `GET` | `/admin/map-lock` | Get mapping lock state | Admin bearer token |
| `POST` | `/admin/map-lock` | Set mapping lock state | Admin bearer token |
| `GET` | `/admin/thresholds` | List location confirmation thresholds | Admin bearer token |
| `PUT` | `/admin/thresholds/:category` | Update a category threshold | Admin bearer token |
| `GET` | `/admin/pending-locations` | Pending-location queue shape for Phase 3 | Admin bearer token |

Admin creation is intentionally admin-only. For local development, set `CAMPUSAR_SEED_ADMIN_EMAIL` before starting the backend to create an in-memory seed admin.

## Scaffold Limitations

- Persistence is in-memory only.
- JWT signing and verification use `jose`, but token revocation and persistent refresh-token tracking are not implemented yet.
- OTP delivery integrates with Resend when `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` are configured. Development mode without Resend returns `devCode`; production does not expose OTP codes in API responses.
- Password-based login is not implemented because SRS only specifies registration and OTP requirements, not password policy.
- Map data is placeholder seed data only.
