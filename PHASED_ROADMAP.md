# CampusAR Phased Roadmap

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

This roadmap mirrors the SRS delivery plan and adds planning-oriented goals, dependencies, and exit criteria. It is not an implementation schedule commitment.

## Phase Operating Rules

Every phase must include documentation and git hygiene:

- Before starting a phase, update `CODEX_HANDOFF.md` with the active owner, scope, backlog IDs, assumptions, and blockers.
- During the phase, keep `BACKLOG.md` statuses current.
- Before closing the phase, update this roadmap with actual completion notes, known exceptions, and deferred items.
- Before closing the phase, update `CODEX_HANDOFF.md` with files touched, checks run, open questions, and the recommended next step.
- If the workspace is a valid git repository, inspect `git status` and create a clear phase checkpoint commit for reviewed changes.
- If git is unavailable or not initialized, record that limitation in `CODEX_HANDOFF.md` instead of pretending a checkpoint exists.

## Phase 1: Foundation, Weeks 1-4

SRS deliverables: Kotlin project, Rust NDK toolchain, GPS navigation outdoor, user auth, backend API.

Primary outcomes:

- Establish Android, native, backend, admin, and shared serialization foundations once implementation is approved.
- Support basic account flows for visitors, students, staff, and admin-created admins.
- Create the first outdoor navigation path using GPS anchor and cached route data.
- Define initial API contracts for auth, map sync, roles, and basic navigation data.

Exit criteria:

- A user can register or continue as visitor.
- Student and staff accounts can complete OTP verification.
- Role and cooldown rules are represented in the system.
- A route can be computed against a simple local campus graph.
- Outdoor GPS-backed navigation renders on the map.

Key dependencies:

- College email domain and OTP provider.
- Initial campus geofence and seed map graph.
- Backend hosting and database choice confirmation.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 2.

CLI 2 backend/data/admin closeout, 2026-06-10:

- Completed TypeScript/Fastify Phase 1 backend scaffold for auth, roles, map bootstrap, sync, relay dedupe, and admin contract routes.
- Completed PostgreSQL/PostGIS Phase 1 schema draft and schema notes.
- Completed Drizzle schema layout, backend API contract, deployment plan, stack decision, and email provider options.
- Completed no-build admin dashboard contract console.
- Verified with `npm run check`, `npm test`, `npm run build`, and `node --check admin-dashboard/app.js`.
- Exceptions: persistence is in-memory; no database migrated; OTP delivery provider is not integrated; seed campus data is placeholder-only.
- Overall Phase 1 is scaffold/build-complete, but not campus-data-complete or device-validated until the APK is tested on the Redmi Note 10 Pro or another Android 8.0+ device.

CLI 1 mobile/native closeout, 2026-06-10:

- Completed Android Phase 1 scaffold under `android-app/` with Gradle project files, plain Android Views, location permission flow, seed destinations, Kotlin native bridge, and `SurfaceView` compass overlay foundation.
- Completed Rust Phase 1 scaffold under `native-engine/` with dependency-free distance, bearing, heading delta, proximity scale, arrival logic, primitive JNI exports, release profile settings, and Android NDK build script.
- Verified Rust host formatting and tests with `cargo fmt --manifest-path native-engine/Cargo.toml -- --check` and `cargo test --manifest-path native-engine/Cargo.toml`.
- Android SDK, NDK, Gradle, JDK 17, and Rust Android targets were installed locally under `C:\tmp\campusar-toolchain`.
- Native `.so` files were built for `arm64-v8a` and `armeabi-v7a` using `native-engine/scripts/build-android.ps1`.
- Android debug build was verified with `gradle -p android-app :app:assembleDebug --stacktrace`.
- Seed campus coordinates remain temporary placeholders until verified OCT geofence, building, and destination data are available.
- Overall Phase 1 can be treated as build-verified for the scaffold. It is not device-validated until the APK is run on an Android device or emulator.

## Phase 2: Sensor Fusion, Weeks 5-8

SRS deliverables: EKF in Rust, PDR, WiFi RSSI, indoor map, floor switching, QR landmark snapping.

Primary outcomes:

- Implement native positioning loop with adaptive sampling.
- Add indoor fallback logic: PDR, WiFi RSSI, magnetic fingerprinting when available.
- Support multi-floor navigation and QR landmark drift reset.
- Provide stable bearing output for compass AR.

Exit criteria:

- EKF/PDR loop operates at SRS target rate when moving.
- Optional sensor absence does not crash positioning.
- QR scan snaps to known location and resets drift.
- Floor switching and floor indicators are represented in navigation.

Key dependencies:

- Known QR anchor locations.
- Indoor floor plans and stair/lift graph transitions.
- WiFi and magnetic fingerprint collection strategy.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 3.

## Phase 3: Crowdsourced Mapping, Weeks 9-12

SRS deliverables: Location contribution, majority voting, admin approval, admin web dashboard v1.

Primary outcomes:

- Enable verified mappers and admins to add nodes and paths while mapping is unlocked.
- Allow verified users to confirm, flag, correct, or give feedback on locations.
- Enforce radius, threshold, one-confirmation-per-user, conflict, and cooldown rules.
- Give admins dashboard controls for approval, rejection, editing, disputes, thresholds, and map lock.

Exit criteria:

- A contributed location can move through pending, confirmed, admin-approved, verified, suspended, or rejected states.
- Admin can lock map creation while allowing confirmations and corrections.
- Conflicting labels and 3+ independent flags enter review.
- Walk counts are tracked for traversed path edges.

Key dependencies:

- Admin role provisioning.
- Confirmation threshold defaults by location category.
- Institutional policy for who can be a verified mapper.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 4.

## Phase 4: Offline And P2P, Weeks 13-16

SRS deliverables: Offline queue, BLE relay, WiFi Direct relay, multi-hop DTN, delta sync, predictive caching.

Primary outcomes:

- Make navigation and map graph access fully offline from local cache.
- Queue contributions and confirmations locally when offline.
- Relay packets through nearby devices using BLE, WiFi Direct, and Google Nearby Connections.
- Support packet chunking, reassembly, deduplication, multi-hop relay, and delta sync.
- Add predictive caching of indoor tiles when a user approaches a building.

Exit criteria:

- Device can navigate without server connectivity.
- Offline contributions survive app restart and later sync.
- A packet can move from offline Device A to intermediate Device B to online Device C to server.
- Server rejects duplicate packet hashes.
- Delta sync transmits only records changed since last sync cursor.

Key dependencies:

- Android permission strategy for nearby devices, Bluetooth, WiFi, background work, and location.
- Packet schema and hash strategy.
- Sync conflict resolution rules.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 5.

## Phase 5: Intelligence And Safety, Weeks 17-20

SRS deliverables: Occupancy heatmap, emergency SOS, lost person detection, magnetic fingerprinting, path anomaly detection.

Primary outcomes:

- Aggregate anonymous occupancy by zone and render heatmap views.
- Add admin notices pinned to locations.
- Implement SOS activation and internet-independent BLE SOS broadcast.
- Detect possible lost-person state from no movement in unfamiliar zones.
- Flag paths with zero traffic for 7 consecutive days.

Exit criteria:

- Occupancy heatmap updates every 60 seconds without exposing individual locations.
- SOS requires a 3-second hold and sends SMS, nearby push, and BLE broadcast paths.
- Lost person detection prompts user after 10 minutes and escalates after 2 minutes without response.
- Path anomaly flagging identifies zero-traffic edges over the SRS window.

Key dependencies:

- Emergency contact configuration model.
- Institutional approval for nearby SOS alerts.
- Privacy rule for occupancy aggregation.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 6.

## Phase 6: Gamification And Social, Weeks 21-24

SRS deliverables: Points, badges, leaderboard, streak system, buddy tracking, faculty availability, notice board, mobile admin panel.

Primary outcomes:

- Award points for verified mapping, confirmation, offline relay, and new-path walking.
- Add badges, streaks, leaderboards, reward animations, haptics, and procedural sound triggers.
- Add opt-in buddy tracking visible to all campus users and stopped outside geofence.
- Add faculty availability with 4-hour expiry.
- Add mobile admin panel for approval, disputes, and map lock.

Exit criteria:

- RewardEngine queues reward events with 300 ms gaps.
- Leaderboards support weekly, all-time, and department filters.
- Buddy tracking broadcasts real-time location only and persists no location history.
- Faculty status is visible when navigating to faculty rooms and expires automatically.
- Mobile admin panel covers SRS-required admin subset.

Key dependencies:

- Department data source.
- Faculty/staff identity source and room mappings.
- WebSocket scaling decision for campus-wide buddy events.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before moving to Phase 7.

## Phase 7: Optimization, Weeks 25-26

SRS deliverables: NEON SIMD, arena allocator, hardware canvas, benchmark validation against all NFR targets.

Primary outcomes:

- Tune sensor fusion, pathfinding, packet serialization, tile caching, and rendering for low-end devices.
- Validate CPU, memory, battery, frame time, startup, query, and BLE latency targets.
- Add release-profile native optimizations such as LTO, `panic=abort`, stripping, feature flags, and later PGO.

Exit criteria:

- Benchmarks are captured on target low-end hardware.
- EKF, AR, map rendering, memory, queue, cold start, battery, and BLE targets meet SRS thresholds or have documented exceptions.
- Adaptive sampling, cache limits, relay scan duty cycle, and wake lock behavior are verified.

Key dependencies:

- Access to Snapdragon 430 class or equivalent test devices.
- Final implementation architecture.
- Repeatable benchmark suite.

Phase closeout requirement:

- Update `BACKLOG.md`, `PHASED_ROADMAP.md`, `CODEX_HANDOFF.md`, and git checkpoint state before release or post-v1.0 planning.

## Cross-Phase Risks

- Offline-first map data and P2P sync are core architecture concerns and should not be postponed as simple add-ons.
- Android background execution and permissions may constrain P2P relay, SOS, and buddy tracking.
- Privacy requirements for buddy tracking and occupancy must shape backend data models from the start.
- Rust/Kotlin FFI design affects performance and maintainability across most phases.
- Admin approval workflows are required before crowdsourced map data can be trusted.
