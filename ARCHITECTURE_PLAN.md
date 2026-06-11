# CampusAR Architecture Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

This is a planning document only. It describes intended architecture and likely repository organization. It does not create scaffolding or implementation code.

## Architectural Goals

- Offline-first navigation: route calculation, map display, and graph traversal must work from local data.
- Native performance for hot paths: EKF, PDR, bearing smoothing, pathfinding, packet encoding, and relay queue logic belong in Rust NDK where specified by the SRS.
- Clear approval model: map creation, confirmation, dispute review, and map lock are admin-governed.
- Graceful degradation: missing optional sensors, no internet, or no nearby peers should reduce capability without crashing.
- Privacy by design: buddy tracking is real-time only, occupancy is anonymous, SOS contacts are encrypted locally.
- Low-end device support: 2 GB RAM baseline, 60 fps AR overlay, adaptive sensor sampling, strict memory budgets.

## High-Level System

| Area | Technology from SRS | Responsibility |
| --- | --- | --- |
| Android app | Kotlin | UI, permissions, sensors, maps, BLE, WiFi Direct, Nearby Connections, Room integration |
| Native engine | Rust via Android NDK | EKF, PDR, pathfinding, bearing filter, graph operations, packets, relay queue, SOS packet handling |
| JNI bridge | Rust `jni` crate and shared memory | Kotlin-to-Rust calls and zero-copy handoff where possible |
| Local storage | Room DB and SQLite / `rusqlite` | Map cache, graph cache, fingerprint database, pending queue, local settings |
| P2P sync | BLE, WiFi Direct, Nearby Connections | Device discovery, packet transfer, chunking, relay, multi-hop opportunistic sync |
| Backend | Node.js, PostgreSQL, PostGIS | Auth, APIs, sync, map verification, roles, dashboard data, WebSocket events |
| Admin dashboard | React | Approval queues, disputes, thresholds, roles, map lock, occupancy heatmap |
| Serialization | Protocol Buffers, bincode/postcard | Compact online payloads and binary relay packets |

## Mobile App Subsystems

- Authentication and account state:
  - Visitor registration without email verification.
  - Student and staff registration with college email OTP.
  - Role and cooldown enforcement.
- Navigation UI:
  - Offline-capable campus map.
  - Floor selector and accessibility route toggle.
  - Destination search and route display.
  - Minimal `SurfaceView` AR overlay.
- Sensor collection:
  - Android `SensorManager` feeds accelerometer, gyroscope, magnetometer, and optional barometer data to Rust.
  - GPS anchors outdoor position when available.
  - Adaptive sampling by motion and screen state.
- Local storage:
  - Cached map graph, tiles, fingerprints, confirmations, queue state, settings, encrypted SOS contact.
- Sync:
  - Server delta sync when online.
  - Rust-managed offline queue when offline.
  - P2P relay discovery and transfer using SRS-specified transports.
- Safety and social:
  - Persistent SOS access from main navigation.
  - Buddy tracking opt-in map display.
  - Faculty availability display and update flow for staff.
- Rewards:
  - RewardEngine queue for points, badges, streaks, particle events, haptics, and procedural sound triggers.

## Rust NDK Module Boundaries

The SRS defines these native modules:

| Module | Planned responsibility |
| --- | --- |
| `ffi/mod.rs` | JNI-exposed functions callable from Kotlin |
| `sensors/fusion.rs` | EKF at 50 Hz using `nalgebra` |
| `sensors/pdr.rs` | Step detection and dead reckoning |
| `sensors/barometer.rs` | Floor detection from pressure deltas |
| `sensors/wifi_rssi.rs` | RSSI fingerprint correction |
| `sensors/magnetic.rs` | Magnetic fingerprint fallback |
| `navigation/bearing.rs` | Haversine and complementary filter bearing logic |
| `navigation/pathfinding.rs` | A* over weighted campus graph |
| `navigation/floor_switch.rs` | Stair and lift transition logic |
| `mapping/location.rs` | Location struct and confidence scoring |
| `mapping/graph.rs` | Weighted node-edge campus graph |
| `mapping/occupancy.rs` | Zone density computation |
| `sync/packet.rs` | Binary packet format and BLE-sized chunks |
| `sync/relay.rs` | DTN relay and deduplication logic |
| `sync/queue.rs` | Persistent offline queue |
| `safety/sos.rs` | SOS packet format and BLE broadcast |
| `utils/math.rs` | Matrix and vector helpers |

Detailed Phase 1 mobile/native planning is tracked in `PHASE1_MOBILE_NATIVE_PLAN.md`.

## Backend Responsibilities

- Auth and role management:
  - Visitor, student, staff, verified mapper, and admin roles.
  - OTP verification for student and staff accounts.
  - Admin-only creation of admin accounts.
  - 7-day cooldown before contribution rights.
- Map data:
  - Location nodes, path edges, floor data, categories, temporary expiry, walk counts, accessibility flags, confidence.
  - Admin approval state, verification thresholds, disputes, flags, feedback, corrections.
  - Map lock state.
- Sync:
  - Delta sync by changed records since last successful sync.
  - Packet hash deduplication for relay uploads.
  - Server rejection of duplicate relay packets.
- Live features:
  - Buddy tracking over WebSocket without persistence.
  - SOS push notifications to online users within 200 meters.
  - Faculty availability status with 4-hour expiry.
  - Occupancy heatmap updates every 60 seconds.
  - Admin notices pinned to locations.

Detailed backend, database, and API planning is tracked in `BACKEND_API_PLAN.md`.
Phase 2 backend/data support planning is tracked in `PHASE2_BACKEND_DATA_SUPPORT_PLAN.md`.

## Admin Dashboard Responsibilities

- Pending location verification queue.
- Dispute and conflict review.
- Approve, reject, edit, suspend, or override location status.
- Lock or unlock mapping phase.
- Configure confirmation thresholds per location category.
- Add, remove, or promote user roles.
- View occupancy heatmap.
- Support the subset of admin actions also available in the mobile admin panel.

## Derived Data Domains

These planning entities are derived from the SRS and should be refined before schema work:

- Users, roles, verification state, contribution cooldown.
- Buildings, floors, zones, rooms, locations, temporary locations.
- Graph nodes, graph edges, accessibility tags, confidence, walk counts.
- Confirmations, corrections, flags, disputes, admin decisions.
- Map lock and threshold configuration.
- Offline packets, packet chunks, hashes, relay metadata, sync cursors.
- Fingerprints for WiFi RSSI and magnetic fields.
- Occupancy snapshots and anonymized zone aggregates.
- SOS events, configured contacts, Bluetooth SOS packets.
- Buddy presence events.
- Faculty status records.
- Points, badges, streaks, leaderboard entries, reward events.
- Admin notices.

## Likely Repository Structure

The following structure is a planning target only and has not been created:

```text
/
  android-app/              # Kotlin Android application
  native-engine/            # Rust NDK crate and JNI bridge
  backend/                  # Node.js API, WebSocket, sync, PostGIS access
  admin-dashboard/          # React admin dashboard
  proto/                    # Protocol Buffer schemas shared by app/backend/Rust
  docs/                     # Product, architecture, API, data model, test docs
  scripts/                  # Future local helper scripts, if needed
```

Open question: exact module names should follow the chosen Android, Rust, Node, and React toolchains once implementation is explicitly approved.

## Critical Data Flows

### Online Navigation

1. User authenticates or continues as visitor.
2. App loads cached map graph and syncs deltas if online.
3. User selects destination.
4. Rust pathfinding computes local walking route.
5. Sensor data streams into Rust EKF/PDR loop.
6. Kotlin UI renders map route and AR overlay state from native outputs.

### Indoor Positioning

1. SensorManager streams accelerometer, gyroscope, magnetometer, and optional barometer.
2. GPS anchors EKF outdoors when available.
3. Indoor fallback order: PDR, WiFi RSSI, magnetic fingerprinting.
4. QR landmark scans snap to exact known points and reset PDR drift.
5. Floor detection uses barometer or fallback step/elevation estimate.

### Crowdsourced Mapping

1. Verified mapper or admin adds a node/path while mapping is unlocked.
2. Verified users confirm existing locations within admin-configured radius.
3. Thresholds and one-confirmation-per-user rules are enforced.
4. Conflicts, flags, corrections, and suspicious records enter admin review.
5. Admin approval finalizes verified status.

### Offline Relay

1. Offline device stores contributions and confirmations in Rust-managed queue.
2. Nearby devices discover each other through BLE, WiFi Direct, and Nearby Connections.
3. Packets are chunked for 512-byte BLE constraints and reassembled.
4. Packet hashes deduplicate repeated relay attempts.
5. A later online relay device uploads packets to the server.
6. Server rejects duplicates and applies valid deltas.

### SOS

1. User holds persistent SOS button for 3 seconds.
2. App sends last known position by SMS to configured emergency contact.
3. Backend sends push notification to online users within 200 meters.
4. Device broadcasts BLE SOS packet to nearby devices independent of internet.

## Security And Privacy Requirements

- HTTPS for all API communication.
- JWT authentication.
- No persisted buddy tracking data on server or disk.
- SOS contact numbers encrypted in local storage.
- Anonymous occupancy heatmap data with no derivable individual locations.
- Account deletion must remove user account and associated contribution data.
- 7-day cooldown for new accounts before map contributions.

## Performance Targets To Preserve In Design

- EKF loop at 50 Hz with under 8% CPU on Snapdragon 430.
- EKF cycle under 500 microseconds.
- Cold start under 3 seconds.
- AR overlay frame time under 16.6 ms.
- Map tile rendering at 30 fps minimum.
- Offline queue handles 10,000 pending packets.
- Nearest-location spatial query under 5 ms for 10,000 locations.
- Steady-state app RSS under 150 MB.
- Active navigation battery drain under 8% per hour.

## Architecture Open Questions

- Where should canonical campus geometry originate: manual admin input, imported CAD/floor plans, OSM data, or initial mapper survey?
- Which map SDK is final for v1.0: OSMDroid or Mapbox SDK?
- Which Android UI stack will own non-AR screens: classic Views, Jetpack Compose, or mixed? The SRS only forbids Compose for the AR overlay.
- What is the exact boundary between Room and Rust `rusqlite` for local persistence?
- How will Rust and Kotlin share structured data: JNI object calls, direct buffers, generated protobuf bindings, or a small custom FFI ABI?
- Which features require background execution and what constraints apply under modern Android background limits?
- What institutional approvals are required for SMS SOS, buddy tracking, occupancy heatmaps, and campus-wide nearby-user notifications?
