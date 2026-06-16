# Onboarding UX Plan

Source: `CampusAR_SRS_v1.0.docx`, User Classes. Closes backlog item **P1-07** ("Plan visitor, student, staff, verified mapper, and admin onboarding UX").

Status: planning deliverable. The backend authentication API for all six roles is fully implemented (see `backend/src/handlers/auth.ts`, `backend/src/routes/index.ts`). This document defines the onboarding flow per user class and the proposed Android screen sequence. **Implementation of the Android onboarding UI is explicitly out of Phase 1 scope** (see Deferred section); the backend is ready, the app surface is a future follow-up.

## User Classes And Capabilities

From `PROJECT_BRIEF.md` User Classes and `backend/src/domain/roles.ts` (`ROLE_CAPABILITIES`).

| User class | Capabilities | Self-register? | Verification |
| --- | --- | --- | --- |
| Visitor | `navigate` | Yes | None |
| Student | `navigate`, `confirm_location`, `buddy_tracking` | Yes | College email OTP |
| Staff | `navigate`, `confirm_location`, `faculty_status` | Yes | College email OTP |
| Faculty | `navigate`, `confirm_location`, `faculty_status` | Yes | College email OTP |
| Verified Mapper | `navigate`, `confirm_location`, `add_location`, `add_path`, `buddy_tracking` | No | Admin-promoted from a verified account |
| Admin | `admin_all` | No | Admin-created, or bootstrap admin from `CAMPUSAR_SEED_ADMIN_EMAIL` |

`VERIFIED_REGISTRATION_ROLES` = student, staff, faculty. Only these are selectable at verified registration. `CONTRIBUTION_COOLDOWN_DAYS = 7`: verified users cannot contribute (`add_location`, `add_path`) until 7 days after account creation. `canContribute()` in `roles.ts` enforces this; `createUser` sets `contributionCooldownUntil = createdAt + 7d`.

## Per-Class Onboarding Flow

Each flow maps to endpoints that already exist. All endpoints are under `/api/v1`.

### Visitor

Instant start, no email required. A visitor can navigate immediately.

1. App shows a single "Continue as Visitor" entry with an optional name field.
2. Client calls `POST /auth/register/visitor` with `{ fullName, email? }`.
3. Response: `{ user, tokens }` (HTTP 201). `verificationStatus` defaults to `not_required`.
4. Client persists the JWT pair and proceeds to navigation.

Request schema (`visitorRegistrationSchema`): `{ fullName: string, email?: string }`.

### Student / Staff / Faculty

College email OTP gate. Email must match `CAMPUSAR_COLLEGE_EMAIL_DOMAIN` (default `oriental.ac.in`).

1. App collects `fullName`, college `email`, `role` (student | staff | faculty), and optional `rollNumber` / `designation` / `department`.
2. Client calls `POST /auth/register/verified`. Response: `{ user, otp: {...} }` (HTTP 201), `verificationStatus: 'otp_pending'`. **No tokens yet.**
3. App shows OTP entry. Client calls `POST /auth/otp/verify` with `{ email, code, challengeId? }`.
4. On success, `verificationStatus` flips to `verified` and response is `{ user, tokens }`. Client persists tokens.
5. If the OTP expired or was lost, client calls `POST /auth/otp/request` with `{ email }` to re-send, then repeats step 3.

Request schema (`verifiedRegistrationSchema`): `{ fullName, email, role?, rollNumber?, designation?, department? }`.

Note: a `otp_pending` account cannot log in. `POST /auth/login` rejects it until OTP is verified.

### Verified Mapper

Not self-serve. A verified mapper is an existing verified user (student/staff/faculty) promoted by an admin.

1. User completes the Student/Staff/Faculty flow above and reaches `verified` status.
2. Admin opens the user in the admin dashboard and assigns the `verified_mapper` role via `POST /admin/users/:id/role`.
3. The account keeps its verified status and gains `add_location`, `add_path`, `buddy_tracking` capabilities, subject to the 7-day contribution cooldown from the original `createdAt`.

Selection of who becomes a verified mapper is an open product question (see Open Questions).

### Admin

Not self-serve. Two provisioning paths:

1. **Bootstrap admin** — created on backend startup from `CAMPUSAR_SEED_ADMIN_EMAIL` (default `vg8904937@gmail.com`). This is the first admin; it bootstraps all subsequent admin actions.
2. **Admin-created admin** — an existing admin calls `POST /admin/admins` to create a new admin account.

Admins log in via `POST /auth/login` (by `email` or `userId`), receive a JWT pair, and use `admin_all` capabilities through the admin dashboard and mobile admin panel.

### Returning User (All Classes)

Login flow for an already-registered account of any class:

1. App collects email (or userId).
2. Client calls `POST /auth/login` with `{ email }` or `{ userId }`.
3. Response: `{ user, tokens }`. Blocks if `verificationStatus === 'otp_pending'` (must complete OTP first).
4. When the access token expires, client calls `POST /auth/refresh` with `{ refreshToken }` to get a new pair.

Token shape (`services/token.ts`): HS256 JWT, payload `{ sub, role, type: 'access'|'refresh', iat, exp }`. Access TTL `CAMPUSAR_ACCESS_TOKEN_SECONDS` (default 3600s), refresh TTL `CAMPUSAR_REFRESH_TOKEN_SECONDS` (default 604800s). Header: `Authorization: Bearer <accessToken>`.

## Proposed Android Screen Sequence (Spec, Not Implementation)

The current app launches straight into an unauthenticated navigation/survey console (`MainActivity`). The proposed first-run gate:

1. **Welcome screen** — choices: "Continue as Visitor", "Sign in with college email", "I already have an account".
2. **Visitor path** — optional name field → `POST /auth/register/visitor` → home.
3. **Verified-registration path** — form (name, email, role select) → `POST /auth/register/verified` → OTP entry screen → `POST /auth/otp/verify` → home.
4. **Returning-user path** — email/userId field → `POST /auth/login` → home.
5. **Session persistence** — store the JWT pair and `PublicUser` in a Room `user_sessions` table; gate `MainActivity` on a valid session; send `Authorization: Bearer` on authenticated calls.
6. **Verified-mapper promotion** — no UI on the target user's side; reflected by role change from the backend. The admin dashboard (Phase 3) performs the promotion.

The existing programmatic-UI style (`MainActivity.buildContentView()`, no XML layouts) and the dark operational aesthetic (`.commandcode/taste/taste.md`, `admin-dashboard/VISUAL_DIRECTION.md`) should drive the screen design when implementation begins.

## Deferred (Out Of Phase 1 Scope)

- **Implementation of the Android onboarding/login UI.** This plan is the spec; building the screens is a future follow-up. The app currently makes unauthenticated sync calls to public map endpoints, which remains valid.
- **OTP delivery in production.** Resend is integrated; sender-domain verification and production API key deployment remain external blockers.
- **Verified-mapper selection process.** How candidates are nominated, vetted, and approved before the first mapping phase is an open product decision (Phase 3, P3-02).
- **Admin dashboard onboarding/admin-management UI.** The React admin dashboard (Phase 3, P3-11) will host the verified-mapper promotion and admin-creation screens.

## Open Questions

Carried forward from `PROJECT_BRIEF.md` and `MAPPING_BOOTSTRAP_PLAN.md`:

- How are verified mappers selected and provisioned before the first mapping phase? (P3-02)
- What is the authoritative source for admin accounts, faculty identity, and faculty rooms?
- What Android permission UX is acceptable for location, camera (QR), and (later) Bluetooth/nearby devices? (P4-11)
- Which backend hosting, domain, certificate, SMS, email, and push providers are approved for production?
