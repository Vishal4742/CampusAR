# CampusAR Project Brief

Source: `CampusAR_SRS_v1.0.docx`, Software Requirements Specification v1.0, June 2026.

## Product Summary

CampusAR is an Android campus navigation system for Oriental College of Technology, Bhopal. It is intended to help visitors, students, faculty, staff, verified mappers, and admins navigate indoor and outdoor campus spaces using cached maps, sensor-fused positioning, walking routes, and a minimal compass-style AR overlay.

The system is designed to work online, offline, and during an active mapping phase. It uses a Kotlin Android app, a Rust NDK native engine, Room/SQLite local storage, peer-to-peer sync, a Node.js backend with PostgreSQL/PostGIS, and a React admin dashboard.

Tagline from SRS: "Your campus. Mapped by everyone. Navigated by you."

## Primary Goals

- Provide walking navigation to any verified campus location.
- Operate fully offline for navigation using cached map data and a local campus graph.
- Build and improve the map through verified crowdsourced contributions.
- Support peer-to-peer relay of offline contributions through BLE, WiFi Direct, and Google Nearby Connections.
- Give admins tools to approve locations, resolve disputes, lock mapping, configure thresholds, and manage roles.
- Keep navigation calm and minimal through a compass-style AR overlay rendered with `SurfaceView`.
- Add safety and campus intelligence features such as SOS, occupancy heatmaps, buddy tracking, faculty availability, and notices.
- Meet low-end Android performance targets, especially Snapdragon 430 class devices with 2 GB RAM.

## User Classes

| User class | SRS permissions |
| --- | --- |
| Visitor | Navigate only, no email verification required |
| Student | Navigate, confirm locations, buddy tracking after college email OTP |
| Staff / Faculty | Navigate, confirm locations, set availability status |
| Verified Mapper | Add locations and paths, plus normal verified-user capabilities |
| Admin | Full access through dashboard and mobile admin panel |

## Operating Modes

| Mode | Behavior |
| --- | --- |
| Online | Full feature set, real-time server sync |
| Offline | Cached navigation graph and map tiles, local queue and P2P relay active |
| Mapping | Verified contributors add and confirm map data until admin locks map creation |

## Scope From SRS v1.0

- Android app in Kotlin for UI, sensors, permissions, BLE, WiFi Direct, and Google Nearby Connections.
- Rust NDK library for EKF, PDR, bearing smoothing, pathfinding, packets, relay queue, SOS packet handling, and related optimized native routines.
- Room/SQLite local cache for map data, graph data, fingerprint data, and offline queue persistence.
- Offline navigation with locally cached tiles and a weighted campus graph.
- P2P sync with BLE, WiFi Direct, Nearby Connections, relay packet chunking, deduplication, multi-hop relay, delta sync, and predictive caching.
- Node.js backend with PostgreSQL/PostGIS for APIs, sync, auth, user management, map verification, and occupancy data.
- React admin dashboard for verification queues, map lock, roles, thresholds, disputes, and occupancy heatmap.
- Crowdsourced map verification with confirmation thresholds, admin approval, conflict review, feedback, flags, corrections, temporary locations, and path walk counts.
- Minimal AR overlay with directional arrow, distance text, proximity animation, turn anticipation, floor indicator, haptics, and arrival state.
- Gamification with points, badges, leaderboards, streaks, rewards, haptics, and procedural sounds.
- Safety and social features: SOS, lost person detection, buddy tracking, faculty availability, and admin notices.

## Non-Goals In SRS v1.0

- iOS support.
- College timetable or ERP integration.
- Full camera AR or ARCore building labels.
- Federated map learning.
- Voice navigation.
- Transfer-learning support for other campuses.
- Event management integration.

These are listed by the SRS as v1.1 or later open items.

## Key Constraints

- Android 8.0, API 26 and above.
- Minimum baseline device: Snapdragon 430 class, 2 GB RAM.
- Required hardware: GPS, accelerometer, gyroscope, magnetometer.
- Optional hardware: barometer, WiFi radio, Bluetooth 4.0+.
- Rust NDK library must compile for `armeabi-v7a` and `arm64-v8a`.
- App must support navigation with zero server connectivity using cached map data.
- AR overlay must render at 60 fps using `SurfaceView` and a dedicated render thread.
- Sensor fusion should target 50 Hz when moving and adapt down to lower sampling rates when idle or screen-off.
- Accuracy is prioritized over battery when these conflict.

## Success Criteria

- A first-time user can navigate to a verified campus location within 60 seconds of app launch.
- Navigation continues when the server is unreachable.
- A* pathfinding runs against the cached graph, including floor transitions and accessibility options.
- Positioning degrades gracefully when optional sensors are missing.
- Admins can control map verification and mapping lock status.
- Offline packets can be queued, relayed, deduplicated, and uploaded by online peers.
- Buddy tracking data is real-time only and not persisted.
- SOS works through SMS, online push, and BLE broadcast paths.
- Performance targets in the SRS are measurable before release.

## Open Questions

- What college email domain and OTP provider should be used for student and staff verification?
- What exact OCT campus geofence, building list, floor plans, QR anchor locations, and initial map graph data are available?
- Which offline map rendering option should be selected for v1.0: OSMDroid or Mapbox SDK?
- What is the authoritative source for emergency contacts, admin accounts, faculty rooms, and faculty identity?
- What privacy threshold or aggregation rule is required so occupancy heatmaps cannot expose individual movement?
- How will verified mappers be selected and provisioned before the first mapping phase?
- What backend hosting, domain, certificate, SMS, email, and push notification providers are approved?
- What Android permission UX is acceptable for BLE, WiFi Direct, nearby devices, location, SMS, notifications, and background work?
