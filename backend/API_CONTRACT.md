# CampusAR Backend API Contract

Owner: CLI 2, WSL Codex.

Status: CLI 2 Phase 1 TypeScript/Fastify scaffold complete. Paths are implemented with in-memory storage until PostgreSQL/PostGIS is connected.

Base path: `/api/v1`

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

Current map data is placeholder-only until OCT campus seed data is approved.

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
- OTP delivery is not integrated with an email provider. Development responses include `devCode` outside production.
- Password-based login is not implemented because SRS only specifies registration and OTP requirements, not password policy.
- Map data is placeholder seed data only.
