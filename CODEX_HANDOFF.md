# CampusAR Codex Handoff

This file is the shared coordination state for Codex sessions. Read it before editing planning docs or starting implementation.

## Current Instruction Boundary

- CLI 2 Phase 1 backend/data/admin scaffold and the approved TypeScript/Fastify conversion are complete inside `backend/`, `database/`, and `admin-dashboard/`.
- CLI 2 Phase 1 is closed from the backend/data/admin side. Remaining Phase 1 gaps are external data/provider verification, CLI 1 device validation, or future implementation phases.
- CLI 2 Phase 2 backend/data support slice is implemented in-memory inside `backend/` with a draft persistence migration in `database/`; live PostgreSQL/PostGIS and React admin dashboard remain deferred.
- CLI 1 Phase 1 mobile/native scaffold is approved inside `android-app/` and `native-engine/` and is build-verified, pending physical device validation.
- Do not install additional dependencies or scaffold new implementation areas without explicit approval.
- Keep work inside the active CLI ownership boundary unless coordination docs require a careful shared update.

## Dual Codex CLI Coordination Rules

These rules apply to both Codex CLI sessions working in this workspace:

- Read `CODEX_HANDOFF.md` before making changes.
- Check the current file list before editing so new files from the other session are not missed.
- Work only in the files owned by the active task unless the handoff says coordination is needed.
- Do not overwrite or delete another session's work. If a touched file changed unexpectedly, read it and merge carefully.
- Keep source implementation paused until the user explicitly approves scaffolding or code.
- After every meaningful planning change, update this handoff with files touched, decisions made, and open questions.
- Prefer small, reviewable document updates over broad rewrites.
- Mark uncertain decisions as open questions instead of inventing requirements beyond the SRS.
- If implementation begins later, each session must state the phase and work item it is handling before editing files.

## Per-Phase Documentation And Git Rule

At the start and end of each phase, the responsible Codex CLI session must update the planning docs and git state:

- Start of phase: update `CODEX_HANDOFF.md` with phase owner, active backlog IDs, assumptions, and blockers.
- During phase: update `BACKLOG.md` statuses as work moves from `Planned` to `In Progress`, `Blocked`, or `Done`.
- End of phase: update `PHASED_ROADMAP.md` with actual completion notes, exceptions, and deferred work.
- End of phase: update `CODEX_HANDOFF.md` with files touched, tests or checks run, unresolved questions, and next phase recommendation.
- Git checkpoint: when this workspace is a valid git repository, run `git status`, review changes, and create a phase checkpoint commit after user-approved implementation or documentation work.
- Git state: this workspace is now initialized as a git repository. It currently has no commits.

## Active Session Ownership

- CLI 1, Windows Codex session owns Android app foundation, Rust NDK native engine foundation, JNI bridge planning, outdoor GPS navigation planning, and AR compass overlay planning.
- Reason: Windows session is focused on Android/mobile/native integration and the highest-risk Kotlin/Rust boundary.
- Active backlog IDs: `P1-01`, `P1-08`, `P2-01`, and `P2-10`.
- Active planning artifact: `PHASE1_MOBILE_NATIVE_PLAN.md`.
- CLI 1 must not edit `backend/`, `database/`, or `admin-dashboard/`.
- CLI 1 Phase 1 mobile/native scaffold is complete and debug-build verified inside `android-app/` and `native-engine/`, pending only device or emulator validation.
- CLI 2, WSL Codex session owns backend, database, API, auth and roles, admin dashboard planning, and sync API planning.
- Reason: WSL is the preferred environment for later Node.js and PostgreSQL/PostGIS work.
- Active backlog IDs: `P2-04`, `P2-05`, `P2-06`, `P2-07`, and `P2-11`.
- Active planning artifacts: `BACKEND_API_PLAN.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, and `PHASE2_BACKEND_DATA_SUPPORT_PLAN.md`.
- CLI 2 must not edit `android-app/` or `native-engine/`.
- CLI 2 Phase 1 backend/data/admin work is complete and checkpointed. Backend stack is implemented as Node.js, TypeScript, Fastify, TypeBox/Ajv, PostgreSQL/PostGIS schema planning, Drizzle, `pg`, and `jose`.
- CLI 2 must get explicit approval before connecting a real PostgreSQL service or scaffolding the React admin dashboard. Resend OTP provider integration is approved and implemented; real keys must remain in local environment variables or deployment secrets.
- CLI 2 has completed the Phase 2 backend/data/admin support slice for `P2-04`, `P2-05`, `P2-06`, and `P2-07` in the in-memory Fastify scaffold, with docs/git coordination still tracked under `P2-11`. CLI 2 must not implement Android sensors, Rust EKF/PDR, or native floor detection.

## Source Analyzed

- `CampusAR_SRS_v1.0.docx`
- Extracted and reviewed the full DOCX text through Python standard-library ZIP/XML parsing because `unzip` is unavailable in this environment.

## Repository State Observed

- Workspace: `C:\Users\vg890\OneDrive\Desktop\CampusAR_1`
- Initial file list contained only `CampusAR_SRS_v1.0.docx`.
- `.git` initially existed as an empty directory in this environment, and `git status` reported this was not a repository.
- `git init` was run successfully on 2026-06-10. Current working branch observed by CLI 2 is `cli1-mobile-native-phase1`.
- CLI 2 Phase 1 checkpoint commit was created on 2026-06-10: `e52d29e` with message `Complete CLI 2 phase 1 backend scaffold`.
- CLI 2 backend decision and mapping-bootstrap checkpoint commit was created on 2026-06-10: `78acb03` with message `docs(backend): record stack and mapping bootstrap decisions`.
- No existing planning docs or handoff file were present before this pass.

## Technical Understanding

CampusAR is an Android-only campus navigation system for Oriental College of Technology, Bhopal. It combines:

- Kotlin Android app for UI, sensors, permissions, maps, BLE, WiFi Direct, Nearby Connections, and local app workflows.
- Rust NDK native engine for EKF sensor fusion, PDR, barometer floor detection, WiFi RSSI and magnetic fingerprint fallback, A* pathfinding, bearing smoothing, packets, relay queue, occupancy computations, and SOS packet handling.
- Room/SQLite local persistence for cached map graph, offline navigation, fingerprints, settings, and queues.
- Offline-first navigation with cached map tiles and campus graph.
- Peer-to-peer sync using BLE, WiFi Direct, Nearby Connections, packet chunking, deduplication, multi-hop relay, delta sync, and predictive caching.
- Node.js backend with PostgreSQL/PostGIS for auth, roles, sync, map data, admin workflows, occupancy, SOS nearby alerts, and WebSocket live features.
- React admin dashboard for map approval, disputes, thresholds, roles, map lock, and occupancy heatmap.
- Crowdsourced map verification through verified mappers, confirmations, thresholds, admin approval, flags, corrections, conflict review, and temporary location expiry.
- Minimal compass-style AR overlay using `SurfaceView`, dedicated render thread, haptics, and reward animations.
- Gamification, occupancy heatmaps, SOS, lost person detection, buddy tracking, faculty availability, notices, and mobile admin panel.

## Files Touched In This Pass

- Created `PROJECT_BRIEF.md`
- Created `ARCHITECTURE_PLAN.md`
- Created `PHASED_ROADMAP.md`
- Created `BACKLOG.md`
- Created `CODEX_HANDOFF.md`
- Updated `CODEX_HANDOFF.md` with dual Codex CLI rules and per-phase doc/git rules.
- Updated `PHASED_ROADMAP.md` with phase operating rules and closeout requirements.
- Updated `BACKLOG.md` with per-phase documentation and git checkpoint work items.
- Created `BACKEND_API_PLAN.md` for WSL-owned backend, database, and API planning.
- Updated `ARCHITECTURE_PLAN.md` to link to backend/API planning.
- Updated `BACKLOG.md` to mark backend API and deployment planning items as in progress.
- Updated `CODEX_HANDOFF.md` with WSL Codex ownership.
- Created `PHASE1_BACKEND_DATA_ADMIN_PLAN.md` for CLI 2 Phase 1 backend/data/admin implementation planning.
- Updated `BACKEND_API_PLAN.md` to link to the Phase 1 implementation plan.
- Updated `CODEX_HANDOFF.md` to expand CLI 2 ownership to backend, database, API, auth/roles, admin dashboard planning, and sync API planning.
- Created `PHASE1_MOBILE_NATIVE_PLAN.md` for CLI 1 Phase 1 Android/Rust/JNI implementation planning.
- Updated `ARCHITECTURE_PLAN.md` to link to mobile/native Phase 1 planning.
- Updated `BACKLOG.md` to mark mobile/native planning items as in progress.
- Updated `CODEX_HANDOFF.md` with CLI 1 ownership.
- Created `backend/` dependency-free Node.js scaffold with health route, API metadata, route catalog, role constants, and sync constants.
- Created `database/` scaffold with Phase 1 PostgreSQL/PostGIS foundation migration and seed-data notes.
- Created `admin-dashboard/` scaffold with Phase 1 dashboard contract notes.
- Updated `PHASE1_BACKEND_DATA_ADMIN_PLAN.md` to reflect approved scaffold status and remaining implementation sequence.
- Completed CLI 2 Phase 1 backend/data/admin scaffold with implemented in-memory auth, roles, map bootstrap, sync, relay dedupe, and admin contract routes.
- Added `backend/API_CONTRACT.md`, `backend/DEPLOYMENT_PLAN.md`, and `database/SCHEMA_NOTES.md`.
- Added `admin-dashboard/index.html`, `admin-dashboard/styles.css`, and `admin-dashboard/app.js` as a no-build admin contract console.
- Added backend tests in `backend/test/app.test.js` and syntax checker in `backend/scripts/check.js`.
- Updated `BACKLOG.md`, `PHASED_ROADMAP.md`, `BACKEND_API_PLAN.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, and `CODEX_HANDOFF.md` for CLI 2 Phase 1 closeout.

No dependencies were installed. No Android or Rust implementation files were created by CLI 2.

## Open Questions To Resolve Before Implementation

- OTP/email provider is decided as Resend. College email domain is decided as `oriental.ac.in`. Resend key is user-held and must not be committed.
- User confirmed no campus dataset exists. Seed campus data currently consists of two Google Maps source links only. Geofence, buildings, floors, paths, rooms, staircases, lifts, QR anchor points, and accessibility metadata must be created through verified mapping/admin workflows.
- Which offline map renderer should be used for v1.0: OSMDroid or Mapbox SDK?
- Which Android UI toolkit should own non-AR screens? The SRS only requires the AR overlay not to use Compose.
- What is the persistence boundary between Room-managed SQLite and Rust `rusqlite`?
- What FFI data exchange shape should be used between Kotlin and Rust?
- What privacy aggregation threshold is required for occupancy heatmaps?
- What institutional approvals are required for buddy tracking, SOS nearby alerts, SMS sending, occupancy analytics, and campus-wide notifications?
- How are verified mappers selected and provisioned?
- Which hosting, SMS, push notification, domain/certificate, and Resend sender-domain setup are approved?
- How should offline contributions resolve conflicts if they arrive after admin rejection, map lock, or newer edits?

## Suggested Next Step

Treat CLI 2 Phase 1 as closed and address the remaining non-CLI-2 closeout items:

1. Device-test the debug APK on the Redmi Note 10 Pro.
2. Configure and verify Resend sender-domain setup without committing API keys.
3. Confirm initial admin/mapper provisioning for collecting real OCT campus data.
4. Decide the Room versus Rust SQLite persistence boundary.
5. Confirm privacy and institutional policies for SOS, buddy tracking, and occupancy.

After those decisions, move into the next narrow implementation slice rather than broad Phase 2 work.

## Suggested Split Between Two Codex Sessions

- Session A: architecture review and decision-making. Own `ARCHITECTURE_PLAN.md`, technical open questions, API boundaries, persistence boundaries, and FFI strategy.
- Session B: documentation and backlog refinement. Own `PROJECT_BRIEF.md`, `PHASED_ROADMAP.md`, `BACKLOG.md`, acceptance criteria, and traceability to SRS requirements.

Coordinate through this file before editing shared docs.

## Active Shared Map Contract Decisions

- Treat Oriental College of Technology as the initial campus entity for backend seed planning.
- OCT draft center coordinate: latitude `23.2462927`, longitude `77.5019383`; source link: `https://maps.app.goo.gl/PoESLVac4tegAM489`.
- This coordinate is a provisional campus center only. It is not a campus geofence, building footprint, gate, indoor coordinate, verified route, or final destination coordinate.
- Unknown building, gate, landmark, path, room, floor, staircase, lift, and QR-anchor coordinates must stay `null` or explicitly marked `provisional` until verified by mapper/admin workflow.
- Android-facing map API contract remains under base path `/api/v1`; CLI 1 should consume `GET /api/v1/sync/manifest`, `GET /api/v1/map/locations`, and `GET /api/v1/map/edges`.
- `GET /api/v1/map/locations` must distinguish `campus`, `building`, `gate`, `landmark`, `room`, `qr_anchor`, and other location categories through stable category keys.
- `GET /api/v1/map/edges` must return path graph edges separately from locations so Rust/Android can build an offline graph without depending on live routing.
- `GET /api/v1/sync/manifest` must include `campusId`, `mapVersion`, `latestChangeId`, entity counts, and a stale/sparse-map signal while OCT data is incomplete.
- Admin dashboard direction is dark operational campus signal console: map-first, sparse chrome, dense status language, serif plus mono typography, film grain, warm horizon gradient, coordinate/status labels, subtle amber/orange active accents, no generic SaaS card layout.

## Change Log

### 2026-06-10 - Planning pass

- Read the SRS.
- Created planning and coordination artifacts only.
- Identified major subsystems, phased roadmap, backlog, likely repo structure, and pre-implementation open questions.

### 2026-06-10 - Coordination rule update

- Added operating rules for both Codex CLI sessions.
- Added per-phase documentation and git checkpoint rule.
- Updated roadmap and backlog to require doc and git updates in every phase.
- At that time, `git status --short` failed because this workspace was not recognized as a valid git repository.

### 2026-06-10 - Git initialization

- Ran `git init` successfully after sandbox approval because the existing `.git` directory was read-only in the sandbox.
- Verified `git status --short --branch`: repository has no commits yet on `master`.
- This note was superseded by the CLI 2 Phase 1 checkpoint commit.

### 2026-06-10 - WSL backend/API planning ownership

- User assigned WSL Codex to backend, database, and API planning because WSL is better suited for later Node.js/PostgreSQL work.
- Created `BACKEND_API_PLAN.md`.
- Marked `P1-04` and `P1-09` as `In Progress` in `BACKLOG.md`.
- No backend scaffolding, database migrations, package manifests, or dependencies were created.

### 2026-06-10 - CLI 2 backend/data/admin Phase 1 plan

- User assigned CLI 2, WSL Codex, as Backend/Data/Admin owner.
- Scope confirmed: Node.js backend, PostgreSQL/PostGIS schema, API design, auth and roles, admin dashboard planning, and sync API planning.
- Created `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`.
- Decisions made: CLI 2 may plan and later implement only `backend/`, `database/`, and `admin-dashboard/` after explicit approval; CLI 2 must not edit `android-app/` or `native-engine/`.
- Next tasks: choose backend framework, package manager, ORM or query builder, migration tool, OTP/email provider, hosting target, seed data format, and admin seed policy.
- Blockers: official college email domain, seed campus data, provider choices, location categories, confirmation thresholds, audit policy, account deletion policy, and offline conflict policy.
- No source code, scaffolding directories, package manifests, database migrations, or dependencies were created.

### 2026-06-10 - CLI 2 backend/data/admin scaffold started

- User said "so start working"; CLI 2 treated this as approval for the previously bounded scaffold only.
- Created allowed scaffold directories: `backend/`, `database/`, and `admin-dashboard/`.
- Backend scaffold decision: use dependency-free Node.js built-in `http` route catalog for now to avoid installing dependencies before framework/tool choices are approved.
- Database scaffold decision: draft PostgreSQL/PostGIS Phase 1 migration covering users, roles, OTP challenges, campus geometry, locations, path edges, QR anchors, map lock, confirmations, sync changes, relay packet hashes, and admin audit events.
- Admin dashboard scaffold decision: keep Phase 1 to contract/planning notes because the SRS places dashboard implementation in Phase 3.
- Check run: `npm run check` inside `backend/` passed with Node syntax checks.
- Files changed by CLI 2: `backend/README.md`, `backend/package.json`, `backend/src/server.js`, `backend/src/app.js`, `backend/src/domain/roles.js`, `backend/src/domain/sync.js`, `backend/src/routes/index.js`, `database/README.md`, `database/migrations/001_phase1_foundation.sql`, `database/seeds/README.md`, `admin-dashboard/README.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, and `CODEX_HANDOFF.md`.
- Next tasks: decide backend framework, TypeScript path, package manager, migration tool, ORM/query builder, OTP provider, hosting target, and seed data format.
- Blockers: official college email domain, approved providers, seed campus data, admin seed account policy, location categories, confirmation thresholds, audit policy, account deletion policy, and offline sync conflict policy.
- No dependencies were installed and no Android/Rust files were touched by CLI 2.

### 2026-06-10 - CLI 2 backend/data/admin Phase 1 complete

- User asked to complete Phase 1; CLI 2 completed only its backend/data/admin ownership area.
- Backend now has dependency-free in-memory Phase 1 behavior for visitor registration, verified OTP registration, OTP verification, login, refresh, current profile, account deletion, map manifest, map seed reads, sync changes, relay packet dedupe, admin users, admin creation, role assignment, audit, map lock, thresholds, and pending-location data shape.
- Database has Phase 1 PostgreSQL/PostGIS migration draft plus schema notes.
- Admin dashboard has a no-build contract console for health, routes, manifest, users, thresholds, and map-lock checks.
- Documentation added: `backend/API_CONTRACT.md`, `backend/DEPLOYMENT_PLAN.md`, `database/SCHEMA_NOTES.md`.
- Backlog updated: `P1-02`, `P1-04`, and `P1-09` are `Done`; `P1-03` is `Blocked` pending college email domain and OTP/email provider.
- Checks run: `npm run check`, `npm test`, direct `node test/app.test.js`, `node --check admin-dashboard/app.js`, and ASCII scan over docs/backend/database/admin-dashboard.
- Results: all checks passed.
- Native-owned `native-engine/` appeared as untracked during this pass; CLI 2 did not inspect or modify it.
- Next CLI 2 tasks: choose backend framework, TypeScript path, package manager, ORM/query builder, migration tool, OTP provider, hosting target, seed data format, admin seed account policy, and conflict policy.
- Blockers remain: official college email domain, approved providers, real OCT campus seed data, location categories, confirmation thresholds, audit/account deletion policies, and offline conflict policy.
- Overall project Phase 1 is not fully closed until CLI 1 mobile/native scope and the shared git checkpoint are complete.

### 2026-06-10 - CLI 2 git checkpoint

- Created git checkpoint commit `e52d29e` with message `Complete CLI 2 phase 1 backend scaffold`.
- Staged CLI 2 backend/data/admin files and shared planning docs only.
- Left CLI 1-owned `PHASE1_MOBILE_NATIVE_PLAN.md`, `android-app/`, and `native-engine/` untracked and untouched by CLI 2.

### 2026-06-10 - CLI 1 mobile/native Phase 1 plan

- User assigned this Windows Codex session as CLI 1, Mobile/Native owner.
- Scope confirmed: Android app foundation, Rust NDK native engine foundation, Kotlin/Rust JNI bridge, GPS navigation slice, and AR compass overlay planning.
- Created `PHASE1_MOBILE_NATIVE_PLAN.md`.
- Updated `ARCHITECTURE_PLAN.md` to link to the CLI 1 Phase 1 mobile/native plan.
- Marked `P1-01`, `P1-08`, `P2-01`, and `P2-10` as `In Progress` in `BACKLOG.md`.
- Decisions made: CLI 1 may plan and later implement only `android-app/` and `native-engine/` after explicit approval; CLI 1 must not edit `backend/`, `database/`, or `admin-dashboard/`.
- Next tasks: choose Android UI toolkit, map renderer, package name, NDK/Rust integration method, JNI return shape, and seed destination source.
- Blockers: implementation approval, Android package name, OSMDroid versus Mapbox, normal UI toolkit choice, NDK integration method, verified seed coordinates, and git checkpoint preference.
- No Android source code, Rust source code, package manifests, build scripts, dependency files, or scaffolding directories were created.

### 2026-06-10 - CLI 1 mobile/native Phase 1 scaffold

- User asked to complete Phase 1; CLI 1 completed only its Android/Rust/mobile-native ownership area.
- Created `android-app/` scaffold with Gradle files, manifest, resources, seed destination asset, plain Android `Activity`, GPS location source, Kotlin native bridge, and `SurfaceView` compass overlay.
- Created `native-engine/` scaffold with dependency-free Rust navigation math, primitive JNI exports, Cargo release profile settings, README, and Android NDK build script.
- Added `.gitignore` for Android, Gradle, Rust target output, generated JNI libraries, IDE files, and OS files.
- Decisions made: package name is `com.campusar.app`; UI uses plain Android Views; map SDK is deferred; JNI uses primitive functions; seed destinations are temporary placeholders until real OCT coordinates are available.
- Checks run: `cargo fmt --manifest-path native-engine/Cargo.toml -- --check` and `cargo test --manifest-path native-engine/Cargo.toml`.
- Results: Rust formatting check passed; Rust tests passed with 6 passed, 0 failed.
- Installed local toolchain under `C:\tmp\campusar-toolchain`: JDK 17, Gradle 8.10.2, Android command-line tools, Android SDK platform 35, build-tools 35.0.0 and 34.0.0, platform-tools, NDK 27.2.12479018, and Rust Android targets `aarch64-linux-android` and `armv7-linux-androideabi`.
- Added `scripts/use-android-toolchain.ps1` to set the local toolchain environment for future PowerShell sessions.
- Android verification completed: `native-engine/scripts/build-android.ps1` built `arm64-v8a` and `armeabi-v7a` native libraries, and `gradle -p android-app :app:assembleDebug --stacktrace` produced `android-app/app/build/outputs/apk/debug/app-debug.apk`.
- Files changed by CLI 1: `.gitignore`, `PHASE1_MOBILE_NATIVE_PLAN.md`, `PHASED_ROADMAP.md`, `BACKLOG.md`, `CODEX_HANDOFF.md`, `android-app/`, and `native-engine/`.
- CLI 1 did not edit `backend/`, `database/`, or `admin-dashboard/`.
- Next tasks: run `android-app/app/build/outputs/apk/debug/app-debug.apk` on an Android device or emulator, replace placeholder campus coordinates with verified OCT seed data, and select the OTP/email provider.

### 2026-06-10 - User backend decisions recorded

- User provided college email domain: `oriental.ac.in`.
- User provided seed admin email: `vg8904937@gmail.com`.
- User requested an extremely fast and optimized backend direction.
- CLI 2 selected the next production backend stack: Node.js, TypeScript, Fastify, TypeBox/Ajv, PostgreSQL/PostGIS, Drizzle, and `pg`.
- User provided two Google Maps links as the only current campus seed source:
  - `https://maps.app.goo.gl/xUen8Rr4UNMqDgfR6`, resolved to `23.2487036, 77.5029367`.
  - `https://maps.app.goo.gl/PoESLVac4tegAM489`, resolved to `23.2462927, 77.5019383`.
- Updated backend config defaults, API contract, deployment notes, backend stack decision, seed-source notes, and in-memory seed pins.
- Remaining CLI 2 blockers: OTP/email provider, real campus geofence/floor/building/path data, production hosting, PostgreSQL tooling, and explicit approval to install dependencies for TypeScript/Fastify conversion.

### 2026-06-10 - No campus dataset confirmed

- User confirmed they do not have any campus data beyond the Google Maps links.
- Added `database/seeds/MAPPING_BOOTSTRAP_PLAN.md`.
- Updated seed notes to treat the two Google Maps points as draft anchors only.
- Updated backlog and backend plan to make mapping walks the source of truth for initial graph creation.
- Key product implication: CampusAR must start with sparse/draft map data and rely on verified mapper/admin workflows before claiming full campus navigation.

### 2026-06-10 - CLI 2 TypeScript/Fastify conversion and provider recommendation

- User approved dependency installation and backend conversion work.
- Installed backend dependencies under `backend/` and kept `backend/node_modules/` ignored by git.
- Converted the active backend path from the dependency-free JavaScript scaffold to TypeScript/Fastify with TypeBox/Ajv validation.
- Added Drizzle config and a TypeScript PostgreSQL/PostGIS schema layout; no database service was created or migrated.
- Replaced scaffold token signing with `jose` JWT signing and verification.
- Removed older tracked JavaScript backend scaffold files after the TypeScript path passed validation.
- Added `backend/EMAIL_PROVIDER_OPTIONS.md`; recommendation is Resend for free-tier MVP OTP email, with Mailgun or MailerSend as fallbacks.
- Recorded the user's Redmi Note 10 Pro as the physical Android test target.
- Files changed by CLI 2: `.gitignore`, `BACKLOG.md`, `CODEX_HANDOFF.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, `PHASED_ROADMAP.md`, `backend/package.json`, `backend/package-lock.json`, `backend/README.md`, `backend/API_CONTRACT.md`, `backend/DEPLOYMENT_PLAN.md`, `backend/STACK_DECISION.md`, `backend/EMAIL_PROVIDER_OPTIONS.md`, `backend/tsconfig.json`, `backend/drizzle.config.ts`, `backend/src/**/*.ts`, and `backend/test/app.test.ts`.
- Checks run: `npm run check`, `npm test`, `npm run build`, and `node --check admin-dashboard/app.js`.
- Results: all checks passed.
- CLI 2 did not edit Android or Rust implementation files.
- Next CLI 2 tasks: choose final OTP provider account, connect PostgreSQL/PostGIS through Drizzle, define real seed-data import format, and keep admin dashboard implementation deferred until approved.
- Blockers: no real campus geofence/building/floor/path/room dataset, OTP sender DNS/account not selected, no production hosting/database target, and no device validation result from the Redmi Note 10 Pro yet.

### 2026-06-11 - CLI 2 Resend OTP integration

- User selected Resend for email OTP and said they have API keys.
- Decision: do not store API keys in git. Use `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` in `backend/.env` or deployment secrets.
- Implemented `backend/src/services/email.ts` with a Resend email adapter using Node's built-in `fetch` and the Resend `/emails` API.
- Updated auth OTP registration/request flows to send OTP through the configured email service. Development mode still returns `devCode` only when Resend is not configured; production requires a configured email provider and never returns OTP codes.
- Updated docs: `backend/.env.example`, `backend/README.md`, `backend/API_CONTRACT.md`, `backend/DEPLOYMENT_PLAN.md`, `backend/EMAIL_PROVIDER_OPTIONS.md`, `BACKLOG.md`, `BACKEND_API_PLAN.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, `PHASED_ROADMAP.md`, and this handoff.
- Checks run: `npm run check`, `npm test`, and `npm run build`.
- Results: all checks passed.
- CLI 2 did not edit Android or Rust implementation files.
- Next CLI 2 tasks: verify Resend with a real sender address/key in local `.env`, then connect PostgreSQL/PostGIS when approved.
- Remaining blockers: Resend sender address/domain verification, no real campus dataset, no production hosting/database target, and no Redmi Note 10 Pro device validation result yet.

### 2026-06-11 - CLI 2 OCT seed and admin console planning

- User instructed CLI 2 to stay out of `android-app/` and `native-engine/` and use the provided references for backend/admin planning only.
- Recorded shared contract decisions before implementation in the `Active Shared Map Contract Decisions` section.
- Treated Oriental College of Technology as the initial campus entity with stable key `oct-bhopal` and provisional center `23.2462927, 77.5019383`.
- Added `database/seeds/OCT_SEED_CONTRACT.md` for campuses, map versions, buildings, gates, landmarks, locations, paths, and source-link seed contracts.
- Added `backend/MAP_SYNC_CONTRACT.md` for Android-facing `GET /api/v1/sync/manifest`, `GET /api/v1/map/locations`, and `GET /api/v1/map/edges`.
- Added `admin-dashboard/VISUAL_DIRECTION.md` for the dark operational campus signal-console direction.
- Updated existing backend/database/admin planning docs to require nullable/provisional coordinates until verified.
- Files changed by CLI 2: `CODEX_HANDOFF.md`, `BACKLOG.md`, `BACKEND_API_PLAN.md`, `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`, `PHASED_ROADMAP.md`, `backend/API_CONTRACT.md`, `backend/MAP_SYNC_CONTRACT.md`, `database/README.md`, `database/SCHEMA_NOTES.md`, `database/seeds/README.md`, `database/seeds/MAPPING_BOOTSTRAP_PLAN.md`, `database/seeds/OCT_SEED_CONTRACT.md`, `database/seeds/source-links.json`, `admin-dashboard/README.md`, and `admin-dashboard/VISUAL_DIRECTION.md`.
- Checks run: JSON parse for `database/seeds/source-links.json`, Markdown/text diff review, and `git diff --check`.
- Results: checks passed.
- CLI 2 did not edit Android or Rust implementation files.
- Next CLI 2 tasks: align SQL/Drizzle schema with nullable/provisional map geometry before applying migrations, then implement endpoint response shapes only after approval.
- Remaining blockers: no verified OCT building/gate/landmark/path dataset, incomplete local visual reference path (`C:` only), production hosting/database target, Resend sender-domain verification, and Redmi Note 10 Pro device validation.

### 2026-06-11 - CLI 2 Phase 1 status resolved

- User asked to resolve whether Phase 1 is complete.
- Decision: CLI 2 Phase 1 is closed from the backend/data/admin side.
- Backend/data/admin completion includes TypeScript/Fastify scaffold, Resend OTP adapter, OCT seed contracts, Android-facing map/sync contracts, admin dashboard visual planning, and git checkpoints.
- Remaining items are explicitly not CLI 2 Phase 1 blockers: physical device validation, verified campus mapping data, production sender/domain verification, production hosting/database provisioning, and future PostgreSQL connection work.
- CLI 2 should not continue expanding Phase 1 unless the user explicitly approves a new backend implementation slice.

### 2026-06-11 - CLI 2 Phase 2 backend/data preparation started

- User asked to prepare for Phase 2.
- CLI 2 scope is backend/data/admin support only: WiFi RSSI fingerprints, magnetic fingerprints, QR anchor metadata, floor metadata, barometer support metadata, and admin review contracts.
- CLI 2 does not own Android sensor implementation, Rust EKF/PDR, JNI payloads, or native floor detection.
- Active backlog IDs: `P2-04`, `P2-05`, `P2-06`, `P2-07`, and `P2-11`.
- Created `PHASE2_BACKEND_DATA_SUPPORT_PLAN.md`.
- Assumptions: OCT is still sparse/provisional, Phase 2 backend work must tolerate missing indoor data, and no new dependencies/database service/admin React scaffold are approved.
- Blockers: no verified OCT floor plans, no QR anchor placement list, no WiFi/magnetic collection procedure, unresolved BSSID privacy policy, unresolved local indoor coordinate system, and no production PostgreSQL/PostGIS target.

### 2026-06-11 - CLI 2 Phase 2 backend/data implementation started

- User said "start completing"; CLI 2 treats this as approval to implement the previously planned backend/data/admin Phase 2 support slice only.
- Scope: in-memory Fastify endpoints and contracts for fingerprint sessions, WiFi RSSI fingerprints, magnetic fingerprints, barometer floor samples/profiles, QR anchor proposals, and admin review routes.
- Out of scope: Android sensor collection, Rust EKF/PDR, JNI contracts, native floor detection, PostgreSQL connection, React admin scaffold, and dependency installation.
- CLI 2 must not edit `android-app/` or `native-engine/`.

### 2026-06-11 - CLI 2 Phase 2 backend/data support slice complete

- Implemented Phase 2 in-memory Fastify contracts for mapper fingerprint sessions, WiFi RSSI uploads, magnetic uploads, barometer samples, floor-profile cache reads, QR anchor proposals, and admin approvals.
- Added admin review behavior: approved fingerprint sessions publish attached WiFi/magnetic samples, rejected sessions hide attached samples, and approved barometer samples update floor-profile cache records.
- Added QR anchor review behavior: proposed QR anchors remain hidden from public map cache reads until admin approval marks them active and verified.
- Added draft PostgreSQL/PostGIS persistence target in `database/migrations/002_phase2_sensor_support.sql` and matching Drizzle schema definitions; no database was started or migrated.
- Updated docs/contracts: `BACKEND_API_PLAN.md`, `BACKLOG.md`, `PHASE2_BACKEND_DATA_SUPPORT_PLAN.md`, `PHASED_ROADMAP.md`, `backend/API_CONTRACT.md`, `backend/MAP_SYNC_CONTRACT.md`, `database/README.md`, `database/SCHEMA_NOTES.md`, and this handoff.
- Backend files changed: `backend/src/handlers/mapping.ts`, `backend/src/routes/index.ts`, `backend/src/services/store.ts`, `backend/src/types.ts`, `backend/src/db/schema.ts`, and `backend/test/app.test.ts`.
- Checks run: `npm run check`, `npm test`, `npm run build`, and `git diff --check`.
- Results: all checks passed.
- CLI 2 did not edit `android-app/` or `native-engine/`.
- Next CLI 2 tasks: connect PostgreSQL/PostGIS and apply/review migrations when approved; add real OCT indoor/fingerprint/QR data after mapper collection; then plan React admin implementation only after explicit approval.
- Remaining blockers: no verified OCT floor/building/path dataset, no QR anchor placement list, unresolved BSSID hashing/salt policy, unresolved indoor coordinate system, no production PostgreSQL/PostGIS target, and Resend sender-domain verification remains external.
