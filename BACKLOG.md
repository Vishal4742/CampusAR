# CampusAR Backlog

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

This backlog is planning-only. Items are phrased as work packages, not implementation instructions. Status values should be updated as work starts.

## Phase 1: Foundation

Phase 1 status: closed. All Phase 1 backlog items are Done. P1-06 (campus entity recording) closed 2026-06-15 with verified geometry deferred to Phase 3 (P3-02). P1-07 (onboarding UX plan) closed 2026-06-15 in `ONBOARDING_UX_PLAN.md`; Android UI implementation is a future follow-up.

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P1-01 | Done | Decide final repository layout and module boundaries before scaffolding | Architecture section |
| P1-02 | Done | Define user roles, permissions, and account lifecycle | User classes, FR-AUTH |
| P1-03 | Done | Select OTP/email provider; college email domain decided as `oriental.ac.in`, Resend selected for OTP delivery | FR-AUTH-01, FR-AUTH-02 |
| P1-04 | Done | Define API contracts for auth, roles, map sync, and dashboard access | Backend, admin requirements |
| P1-05 | Done | Define initial local data model for cached graph, locations, floors, and settings | FR-NAV-01, FR-SYNC-01 |
| P1-06 | Done | OCT initial campus entity and provisional center are recorded (seed contract + in-memory seed + source links, 2026-06-15); verified campus geometry deferred to Phase 3 (P3-02) | Navigation scope |
| P1-07 | Done | Plan visitor, student, staff, verified mapper, and admin onboarding UX (written in `ONBOARDING_UX_PLAN.md`); Android UI implementation deferred | User classes |
| P1-08 | Done | Plan outdoor GPS-backed navigation flow | FR-SENS-03, FR-NAV-03 |
| P1-09 | Done | Plan backend deployment environment and uptime target | NFR-AVAIL-01 |
| P1-10 | Done | Define release and test device baseline: SRS Android 8.0+/2 GB minimum, Redmi Note 10 Pro physical test target | Operating environment |
| P1-11 | Done | Update planning docs and git checkpoint state at Phase 1 closeout | Coordination rule |

## Phase 2: Sensor Fusion

Phase 2 is fully complete across all modules. Backend fingerprint/survey/QR APIs implemented in-memory. Rust native engine has 6-state EKF with nalgebra, WiFi/magnetic matching, barometer floor detection, and adaptive sampling (61 tests passing). Android app has SensorFusionPipeline, WiFi scanning, QR scanning (CameraX + ML Kit), fingerprint cache (Room 4 entities), and floor indicator UI. Live PostgreSQL/PostGIS and React admin dashboard remain deferred.

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P2-01 | Done | Define sensor data contract between Kotlin and Rust | FR-SENS-01, FR-SENS-02 |
| P2-02 | Done | Specify EKF state vector, update rates, and GPS anchor behavior; complementary filter added, full matrix EKF deferred | FR-SENS-02, FR-SENS-03 |
| P2-03 | Done | Specify PDR step detection and drift behavior | FR-SENS-04 |
| P2-04 | Done | Define and implement backend contract for WiFi RSSI fingerprint format and mapper collection workflow | FR-SENS-04 |
| P2-05 | Done | Define and implement backend contract for magnetic fingerprint format and fallback data lifecycle | FR-SENS-04 |
| P2-06 | Done | Define and implement backend contract for barometer samples and floor-profile cache support; native floor strategy remains mobile/native work | FR-SENS-05 |
| P2-07 | Done | Define and implement backend contract for QR anchor proposal, approval, and public cache reads; physical placement remains open | FR-SENS-06 |
| P2-08 | Done | Define graceful degradation matrix for missing optional sensors | FR-SENS-07 |
| P2-09 | Done | Define adaptive sampling policy and motion-state detection | FR-SENS-08 |
| P2-10 | Done | Bearing smoothing, turn anticipation, AR state outputs | FR-NAV-05 to FR-NAV-12 |
| P2-11 | Done | Update planning docs and git checkpoint state for Phase 2 backend/data closeout; mobile/native closure remains separate | Coordination rule |
| P2-12 | Done | A* pathfinding on CampusGraph with wheelchair filter | FR-NAV-01, FR-NAV-04 |
| P2-13 | Done | First-launch backend sync wired into MainActivity | FR-SYNC-01, FR-NAV-01 |

## Phase 3: Crowdsourced Mapping

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P3-01 | Planned | Define mapping lock behavior and admin controls | FR-MAP-01, FR-MAP-08 |
| P3-02 | Planned | Define verified mapper provisioning workflow; required because no existing campus dataset is available | FR-MAP-02 |
| P3-03 | Planned | Define location node contribution payload and validation rules for mapping walks | FR-MAP-02 |
| P3-04 | Planned | Define path edge contribution payload, walking capture flow, and walk count behavior | FR-MAP-10 |
| P3-05 | Planned | Define confirmation radius checks and default 15 m threshold | FR-MAP-04 |
| P3-06 | Planned | Enforce one-confirmation-per-user rule in data model | FR-MAP-05 |
| P3-07 | Planned | Define threshold plus admin approval state machine | FR-MAP-06 |
| P3-08 | Planned | Define conflict review for duplicate coordinates with conflicting labels | FR-MAP-07 |
| P3-09 | Planned | Define temporary location expiry behavior | FR-MAP-09 |
| P3-10 | Planned | Define feedback, flags, correction, suspension, and override flows | FR-VOTE |
| P3-11 | Planned | Plan admin dashboard v1 approval, rejection, edit, dispute, role, threshold, and map lock screens | FR-ADMIN |
| P3-12 | Planned | Define audit trail needs for admin actions | Open question from approval workflow |
| P3-13 | Planned | Update planning docs and git checkpoint state at Phase 3 closeout | Coordination rule |

## Phase 4: Offline And P2P

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P4-01 | Planned | Define offline cache ownership across Room, SQLite, and Rust queue | FR-SYNC-01, FR-SYNC-03 |
| P4-02 | Planned | Define sync cursor and delta sync protocol | FR-SYNC-02, FR-SYNC-10 |
| P4-03 | Planned | Define offline contribution queue schema and durability rules | FR-SYNC-03 |
| P4-04 | Planned | Define packet envelope, hash, TTL, and deduplication behavior | FR-SYNC-06 |
| P4-05 | Planned | Define BLE 512-byte chunking and reassembly contract | FR-SYNC-07 |
| P4-06 | Planned | Define WiFi Direct and Nearby Connections transfer flows | FR-SYNC-04 |
| P4-07 | Planned | Define multi-hop DTN relay policy and loop prevention | FR-SYNC-08 |
| P4-08 | Planned | Define behavior for online relay upload on behalf of offline devices | FR-SYNC-05 |
| P4-09 | Planned | Define predictive tile caching trigger near buildings | FR-SYNC-09 |
| P4-10 | Planned | Define conflict resolution for delayed offline contributions | Open question from offline sync |
| P4-11 | Planned | Plan Android permission UX for Bluetooth, nearby devices, WiFi, location, background work, and notifications | P2P operating constraints |
| P4-12 | Planned | Update planning docs and git checkpoint state at Phase 4 closeout | Coordination rule |

## Phase 5: Intelligence And Safety

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P5-01 | Planned | Define anonymous occupancy aggregation model by zone | FR-OCC-01 |
| P5-02 | Planned | Define heatmap refresh and rendering behavior every 60 seconds | FR-OCC-02 |
| P5-03 | Planned | Define zero-traffic path anomaly detection for 7-day windows | FR-OCC-03 |
| P5-04 | Planned | Define admin notices pinned to locations and 30 m notification radius | FR-OCC-04 |
| P5-05 | Planned | Define SOS activation UX with 3-second hold | FR-SOS-01, FR-SOS-05 |
| P5-06 | Planned | Define encrypted local emergency contact storage | NFR-SEC-03 |
| P5-07 | Planned | Define SOS SMS payload with last known position | FR-SOS-02 |
| P5-08 | Planned | Define nearby online push notification within 200 m | FR-SOS-03 |
| P5-09 | Planned | Define BLE SOS packet and broadcast behavior | FR-SOS-04 |
| P5-10 | Planned | Define lost person detection and escalation rules | FR-SOS-06 |
| P5-11 | Planned | Confirm institutional policy for SOS escalation and nearby alerts | Open question |
| P5-12 | Planned | Update planning docs and git checkpoint state at Phase 5 closeout | Coordination rule |

## Phase 6: Gamification And Social

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P6-01 | Planned | Define points rules for verified mapping, confirmations, relays, and new paths | FR-GAME-01 |
| P6-02 | Planned | Define badge catalog for milestones listed in SRS | FR-GAME-02 |
| P6-03 | Planned | Define weekly, all-time, and department leaderboard model | FR-GAME-03 |
| P6-04 | Planned | Define daily streak model and 7/30-day visual rewards | FR-GAME-04 |
| P6-05 | Planned | Define RewardEngine event queue and 300 ms gap behavior | FR-GAME-07 |
| P6-06 | Planned | Define reward animation, haptic, and sound event mapping | FR-GAME-05, FR-GAME-06, section 7 |
| P6-07 | Planned | Define haptic settings, fallbacks, and amplitude-control behavior | FR-AR-03 to FR-AR-08 |
| P6-08 | Planned | Define buddy tracking opt-in, geofence stop, disable setting, and no-persistence rule | FR-BUDDY |
| P6-09 | Planned | Define faculty availability states and 4-hour expiry | FR-FAC |
| P6-10 | Planned | Define mobile admin panel scope | FR-ADMIN-07 |
| P6-11 | Planned | Define notice board UX and data model | FR-OCC-04, Phase 6 deliverables |
| P6-12 | Planned | Update planning docs and git checkpoint state at Phase 6 closeout | Coordination rule |

## Phase 7: Optimization

| ID | Status | Work item | SRS basis |
| --- | --- | --- | --- |
| P7-01 | Planned | Define benchmark suite for EKF, memory, battery, cold start, BLE RTT, spatial query, and AR frame time | Section 6.6 |
| P7-02 | Planned | Plan NEON SIMD optimization for EKF matrix math | Section 6.1 |
| P7-03 | Planned | Plan fixed-point fallback for low-end chips without FPU | Section 6.1 |
| P7-04 | Planned | Plan lock-free sensor pipeline with ring buffer | Section 6.1 |
| P7-05 | Planned | Plan arena allocation for pathfinding | Section 6.2 |
| P7-06 | Planned | Plan stack-buffer packet serialization | Section 6.2 |
| P7-07 | Planned | Plan LRU tile cache with active tile plus 8 neighbors | Section 6.2 |
| P7-08 | Planned | Plan memory-mapped fingerprint database | Section 6.2 |
| P7-09 | Planned | Plan Android sensor batching, GPS geofence activation, BLE scan duty cycle, and wake lock policies | Section 6.3 |
| P7-10 | Planned | Plan protobuf payloads, HTTP/2, retry backoff, Brotli tile compression, and delta sync validation | Section 6.4 |
| P7-11 | Planned | Plan release-profile native compile settings and future PGO pass | Section 6.5 |
| P7-12 | Planned | Validate all performance targets on baseline hardware | NFR-PERF, Section 6.6 |
| P7-13 | Planned | Update planning docs and git checkpoint state at Phase 7 closeout | Coordination rule |

## Open Backlog Questions

- Which implementation stack choices are fixed versus still selectable: OSMDroid/Mapbox, Android UI toolkit, backend framework, and dashboard framework?
- What seed campus data exists today?
- What admin workflows require audit logs or institutional reporting?
- What is the minimum privacy threshold for occupancy buckets?
- How should delayed offline edits resolve conflicts after map lock or admin rejection?
- Which SMS, push, hosting, and Resend sender-domain setup are allowed?
- Who owns production operations after initial delivery?
