# Phase 1 Backend, Data, And Admin Implementation Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

Owner: active Codex session for backend/data/admin work.

Scope: backend, database, API design, auth and roles, admin dashboard planning, and sync API planning.

This plan tracks Phase 1 backend/data/admin implementation. Status: closed for the backend/data/admin side.

## Backend/Data/Admin Boundary

Backend/data/admin work may plan and later implement, after explicit approval:

- `backend/`
- `database/`
- `admin-dashboard/`
- Backend/API/admin/database planning docs

Backend/data/admin work must not edit:

- `android-app/`
- `native-engine/`
- Android Kotlin implementation files
- Rust NDK implementation files

## Phase 1 Goal

Phase 1 backend/data work establishes the server-side foundation needed for:

- User registration and login.
- Visitor, student, staff/faculty, verified mapper, and admin roles.
- College email OTP verification for student and staff accounts.
- Admin-only admin creation.
- Seven-day contribution cooldown.
- JWT-secured API access.
- Initial campus map data model and sync contracts.
- Backend support for future admin dashboard approval workflows.

The SRS lists the Phase 1 deliverables as Kotlin project, Rust NDK toolchain, GPS navigation outdoor, user auth, and backend API. This plan covers only the backend/data/admin parts of those deliverables.

## Approved-Only Scaffold Boundary

Implementation approval for this backend/data/admin slice is limited to:

```text
backend/
admin-dashboard/
database/
```

No Android or Rust directories should be created or edited as part of this slice.

## Scaffold Status

Phase 1 is complete for backend/data/admin. Remaining open items are external verification, future implementation phases, or mobile/native work.

Created for this slice:

- `backend/`: TypeScript/Fastify backend with in-memory Phase 1 auth, roles, map bootstrap, sync, relay dedupe, admin contract routes, TypeBox validation, Drizzle schema layout, and `jose` JWTs.
- `database/`: PostgreSQL/PostGIS Phase 1 foundation migration, schema notes, and seed-data notes.
- `admin-dashboard/`: no-build contract console for local backend smoke checks plus planning notes for future React dashboard work.

Not done:

- No database created or migrated.
- No PostgreSQL service connected.
- Resend OTP provider adapter is integrated; real key and sender address must be supplied through local environment or deployment secrets.
- No Android or Rust files touched.

## Phase 1 Work Packages

| ID | Area | Plan |
| --- | --- | --- |
| B1-01 | Repository boundary | Keep backend, database, and admin dashboard work isolated from Android and Rust ownership. |
| B1-02 | Backend framework decision | Done: Node.js + TypeScript + Fastify + TypeBox/Ajv. |
| B1-03 | Database baseline | Plan PostgreSQL with PostGIS as the authoritative server database. |
| B1-04 | Auth model | Plan visitor registration, verified student/staff OTP registration, login, refresh, and account deletion. |
| B1-05 | Roles | Plan visitor, student, staff/faculty, verified mapper, and admin authorization rules. |
| B1-06 | Admin creation | Plan admin-only creation or promotion of admin users. |
| B1-07 | Contribution cooldown | Enforce seven-day cooldown before map contributions are accepted from new accounts. |
| B1-08 | Map seed model | Plan buildings, floors, zones, locations, path edges, accessibility tags, QR anchors, and campus geofence. |
| B1-09 | Sync model | Plan map manifest, sync cursor, changed records, and delta sync API contracts. |
| B1-10 | Relay model | Plan packet hash deduplication and relay upload acceptance states. |
| B1-11 | Admin dashboard contracts | Plan dashboard-facing APIs for roles, map lock, thresholds, and future approval queues. |
| B1-12 | Security baseline | Plan HTTPS, JWT, role checks, cooldown checks, input validation, and admin audit events. |
| B1-13 | Deployment assumptions | Document hosting, domain, TLS, email, SMS, push, and database assumptions once selected. |

## Conceptual Phase 1 Data Model

Final schema names can change during implementation. The Phase 1 model should cover these entities:

- User:
  - identity, name, email, roll number or designation, role, verification state, department, account status, created timestamp.
- Auth verification:
  - OTP challenge, target email, expiry, attempt count, verification status.
- Role assignment:
  - current role, assigned by, assigned timestamp, optional reason.
- Contribution eligibility:
  - user creation timestamp, cooldown expiry timestamp, contribution allowed flag derived from role and cooldown.
- Campus:
  - campus name, geofence geometry, active map version.
- Building:
  - name, code, geometry or centroid, floor count.
- Floor:
  - building reference, floor label, floor index.
- Zone:
  - floor or outdoor area, polygon geometry, occupancy aggregation boundary.
- Location:
  - label, category, floor/building/zone, point geometry, verification status, confidence, temporary expiry if applicable.
- Path edge:
  - source node, target node, geometry, floor transition metadata, accessibility flag, walk count, confidence.
- QR anchor:
  - location reference, code identifier, exact snap point.
- Sync cursor:
  - user or device cursor, last server change token.
- Change log:
  - record type, operation, version, timestamp, sync visibility.
- Relay packet hash:
  - packet hash, first seen timestamp, accepted or rejected state.
- Admin audit event:
  - actor, action, target type, target id, timestamp, old/new summary.

## Candidate Phase 1 API Groups

Endpoint paths are placeholders and should be finalized during implementation.

### Auth

- `POST /auth/register/visitor`
- `POST /auth/register/verified`
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /me`
- `DELETE /me`

### Roles And Admin Users

- `GET /admin/users`
- `POST /admin/users/:id/role`
- `POST /admin/admins`
- `GET /admin/audit`

### Map Bootstrap And Sync

- `GET /sync/manifest`
- `GET /sync/changes?since=cursor`
- `POST /sync/changes`
- `POST /sync/relay-packets`
- `GET /map/buildings`
- `GET /map/floors`
- `GET /map/locations`
- `GET /map/edges`
- `GET /map/qr-anchors`

### Admin Dashboard Foundation

- `GET /admin/map-lock`
- `POST /admin/map-lock`
- `GET /admin/thresholds`
- `PUT /admin/thresholds/:category`
- `GET /admin/pending-locations`

Open question: `GET /admin/pending-locations` may be Phase 3 implementation, but its contract should be planned early so data model choices do not block admin dashboard work.

## Auth And Role Rules

- Visitor accounts require no email verification and can navigate only.
- Student accounts require college email OTP before verified-user features.
- Staff/faculty accounts require college email OTP before verified-user features.
- Admin accounts are created only by existing admins through admin tooling.
- Verified mapper is a special elevated role that can add new locations and paths.
- New accounts have a seven-day cooldown before map contributions.
- Role checks must be enforced server-side, not only in clients.

## Sync API Rules

- Sync APIs must be idempotent because offline and relay submissions can be retried.
- Delta sync should use server-issued cursors or change tokens.
- Relay uploads must return accepted, duplicate, rejected, or conflict results per packet.
- Packet hash deduplication is server-authoritative.
- Local navigation cannot depend on live backend routing; backend only supplies data for the cached graph.
- Delayed offline conflicts must be visible to admin if automatic resolution is unsafe.

## Admin Dashboard Phase 1 Scope

The React admin dashboard is not a Phase 1 SRS deliverable. Phase 1 should prepare:

- Admin login and JWT role support.
- Admin role-management API contracts.
- Map lock and threshold API contracts.
- Pending-location data shape for future approval queues.
- Audit-event model for admin decisions.

No admin dashboard UI should be scaffolded unless implementation is explicitly approved.

## Phase 1 Backend/Data/Admin Completion

Completed in this phase:

- TypeScript/Fastify server using TypeBox/Ajv validation.
- In-memory store for Phase 1 behavior until PostgreSQL/PostGIS is connected.
- Visitor registration.
- Verified student/staff/faculty OTP challenge, Resend delivery adapter, and verification flow.
- JWT signed access and refresh tokens using `jose`.
- Current-user and account deletion route.
- Map manifest and placeholder seed map reads.
- Delta sync and relay packet deduplication route behavior.
- Admin-only user list, admin creation, role assignment, audit, map lock, threshold, and pending-location route shapes.
- Drizzle config and TypeScript schema draft for PostgreSQL/PostGIS.
- OCT initial campus seed contract and Android-facing map/sync contract.
- API contract, deployment plan, database schema notes, and no-build admin console.
- Backend tests, TypeScript checks, and production compile.

Deferred after Phase 1 backend/data/admin:

1. Connect services to PostgreSQL/PostGIS through Drizzle.
2. Review and apply the Phase 1 PostGIS migration through the chosen migration workflow.
3. Verify Resend delivery with a real key and approved sender address.
4. Replace placeholder seed data with approved OCT campus seed data.
5. Align the SQL/Drizzle schema with nullable/provisional coordinates before applying migrations.
6. Add a React admin dashboard shell only when dashboard implementation is approved.
7. Run device validation on the Redmi Note 10 Pro after the APK is installed.

## Remaining Phase 1 Blockers

- Resend sender address/domain verification.
- Backend hosting target and database hosting target.
- Real OCT campus geofence, buildings, floors, rooms, paths, staircases, lifts, QR anchors, and accessibility metadata.
- Location categories and default confirmation thresholds.
- Audit and account deletion policy.

## Next Backend/Data/Admin Tasks

- Connect the in-memory service boundary to PostgreSQL/PostGIS.
- Turn the conceptual model into a reviewed entity relationship plan.
- Draft an OpenAPI-style contract once endpoint shapes are approved.
- Define seed data import format for campus geometry.
- Define admin dashboard information architecture for Phase 3 while keeping Phase 1 implementation focused.
