# CampusAR Codex Handoff

This file is the shared coordination state for Codex sessions. Read it before editing planning docs or starting implementation.

## Current Instruction Boundary

- CLI 2 Phase 1 backend/data/admin scaffold is complete inside `backend/`, `database/`, and `admin-dashboard/`.
- Do not create Android or Rust scaffolding unless explicitly requested later for CLI 1.
- Do not install dependencies.
- Keep unapproved areas limited to understanding, planning, and coordination documents.

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
- Implementation remains paused for CLI 1 until the user explicitly approves Android/Rust scaffolding or source code.
- CLI 2, WSL Codex session owns backend, database, API, auth and roles, admin dashboard planning, and sync API planning.
- Reason: WSL is the preferred environment for later Node.js and PostgreSQL/PostGIS work.
- Active backlog IDs: `P1-04` and `P1-09`.
- Active planning artifacts: `BACKEND_API_PLAN.md` and `PHASE1_BACKEND_DATA_ADMIN_PLAN.md`.
- CLI 2 must not edit `android-app/` or `native-engine/`.
- CLI 2 Phase 1 backend/data/admin scaffold is complete. Next CLI 2 work requires decisions on framework, TypeScript, PostgreSQL tooling, providers, and seed data.

## Source Analyzed

- `CampusAR_SRS_v1.0.docx`
- Extracted and reviewed the full DOCX text through Python standard-library ZIP/XML parsing because `unzip` is unavailable in this environment.

## Repository State Observed

- Workspace: `C:\Users\vg890\OneDrive\Desktop\CampusAR_1`
- Initial file list contained only `CampusAR_SRS_v1.0.docx`.
- `.git` initially existed as an empty directory in this environment, and `git status` reported this was not a repository.
- `git init` was run successfully on 2026-06-10. Current branch is the default `master` branch with no commits yet.
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

- What is the official college email domain and OTP/email provider?
- What seed campus data exists: geofence, buildings, floors, paths, rooms, staircases, lifts, QR anchor points, and accessibility metadata?
- Which offline map renderer should be used for v1.0: OSMDroid or Mapbox SDK?
- Which Android UI toolkit should own non-AR screens? The SRS only requires the AR overlay not to use Compose.
- What is the persistence boundary between Room-managed SQLite and Rust `rusqlite`?
- What FFI data exchange shape should be used between Kotlin and Rust?
- What privacy aggregation threshold is required for occupancy heatmaps?
- What institutional approvals are required for buddy tracking, SOS nearby alerts, SMS sending, occupancy analytics, and campus-wide notifications?
- How are verified mappers selected and provisioned?
- Which hosting, SMS, email, push notification, and domain/certificate providers are approved?
- How should offline contributions resolve conflicts if they arrive after admin rejection, map lock, or newer edits?

## Suggested Next Step

Review the planning docs against the SRS and answer the highest-impact open questions:

1. Confirm map renderer and Android UI approach.
2. Confirm initial campus data source and admin/mapper provisioning.
3. Decide the Room versus Rust SQLite persistence boundary.
4. Decide the Kotlin/Rust FFI contract style.
5. Confirm privacy and institutional policies for SOS, buddy tracking, and occupancy.

After those decisions, create a narrow implementation plan for Phase 1 only. Do not scaffold until explicitly approved.

## Suggested Split Between Two Codex Sessions

- Session A: architecture review and decision-making. Own `ARCHITECTURE_PLAN.md`, technical open questions, API boundaries, persistence boundaries, and FFI strategy.
- Session B: documentation and backlog refinement. Own `PROJECT_BRIEF.md`, `PHASED_ROADMAP.md`, `BACKLOG.md`, acceptance criteria, and traceability to SRS requirements.

Coordinate through this file before editing shared docs.

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
- Current tracked state: all SRS and planning files are still untracked until an initial commit is requested.

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
