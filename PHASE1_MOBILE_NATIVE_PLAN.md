# Phase 1 Mobile And Native Implementation Plan

Source: `CampusAR_SRS_v1.0.docx`, SRS v1.0.

Owner: CLI 1, Windows Codex.

Scope: Android app foundation, Rust NDK native engine foundation, Kotlin/Rust JNI boundary, outdoor GPS navigation slice, and compass-style AR overlay planning.

Status: CLI 1 Phase 1 scaffold now includes `android-app/` and `native-engine/`. Android build verification is blocked in this Windows session because `gradle` is not installed, Android SDK environment variables are not set, and Android Rust targets are not installed.

## Phase 1 Decisions Applied

- Android package name: `com.campusar.app`.
- Normal Android UI stack: plain Android Views, no Compose dependency.
- Map SDK: deferred; no OSMDroid or Mapbox dependency added in Phase 1.
- Rust/Android integration: standalone Cargo crate plus `scripts/build-android.ps1` for later NDK builds.
- JNI return shape: primitive JNI functions only, avoiding object-heavy JNI for the first bridge.
- Seed data: temporary placeholder destinations in `android-app/app/src/main/assets/seed_destinations.json` until verified OCT coordinates are available.

## CLI 1 Boundary

CLI 1 may plan and later implement, after explicit approval:

- `android-app/`
- `native-engine/`
- Mobile/native planning docs
- Kotlin Android app structure
- Rust NDK crate structure
- JNI bridge and native API contract
- Mobile-side navigation, sensor, map, AR overlay, and permission flows

CLI 1 must not edit:

- `backend/`
- `database/`
- `admin-dashboard/`
- Backend, database, and admin implementation files owned by CLI 2

Shared contracts with CLI 2 should be proposed in planning docs first, then agreed through `CODEX_HANDOFF.md`.

## Phase 1 Goal

Phase 1 mobile/native work should prove the smallest useful CampusAR navigation foundation:

- Android project shell.
- Rust NDK toolchain wired into the Android build.
- JNI call path from Kotlin to Rust.
- Outdoor GPS-backed current location.
- One manually seeded destination.
- Rust bearing and distance calculation.
- Kotlin UI showing a basic navigation screen.
- Minimal compass-style overlay state ready for later `SurfaceView` rendering.

The goal is not full EKF, indoor positioning, P2P relay, gamification, or admin workflows. Those belong to later phases.

## Approved-Only Scaffold Boundary

If implementation is later explicitly approved, CLI 1 may scaffold only:

```text
android-app/
native-engine/
```

No backend, database, admin dashboard, package manifests for server code, or migration files should be created by CLI 1.

## Phase 1 Work Packages

| ID | Area | Plan |
| --- | --- | --- |
| M1-01 | Repository boundary | Keep Android and Rust work isolated from CLI 2 backend/data/admin ownership. |
| M1-02 | Android toolchain decision | Confirm Android Gradle Plugin, Kotlin version, minimum SDK 26, target SDK, Java toolchain, and NDK version before scaffolding. |
| M1-03 | UI toolkit decision | Decide non-AR screen UI stack. The SRS only requires that the AR overlay itself not use Compose. |
| M1-04 | Map renderer decision | Decide OSMDroid versus Mapbox SDK before implementing map screens or tile cache logic. |
| M1-05 | Rust crate baseline | Plan `cdylib` native library shape, crate modules, release profiles, and Android targets `armeabi-v7a` and `arm64-v8a`. |
| M1-06 | JNI contract | Define a small stable ABI for Phase 1: initialize engine, calculate bearing/distance, smooth heading, and return navigation overlay state. |
| M1-07 | GPS navigation slice | Plan Android location permission flow, current location updates, seeded destination selection, and route placeholder behavior. |
| M1-08 | Compass overlay state | Define native output needed by UI: bearing degrees, distance meters, proximity scale, color phase, arrival flag, and next-turn placeholder. |
| M1-09 | Local seed data | Define temporary app-bundled seed format for one or more destinations until backend sync and campus seed data are available. |
| M1-10 | Test strategy | Plan Rust unit tests for distance/bearing math and Android instrumentation or manual smoke tests for JNI loading. |
| M1-11 | Performance guardrails | Preserve later SRS targets by avoiding allocations in hot native paths and separating future render thread concerns from normal UI. |
| M1-12 | Documentation handoff | Update `CODEX_HANDOFF.md` and backlog status before and after any approved implementation. |

## Recommended Phase 1 Directory Shape

This structure is a planning target only:

```text
android-app/
  app/
    src/main/
      AndroidManifest.xml
      java or kotlin package tree
      res/
    build.gradle.kts
  settings.gradle.kts
  build.gradle.kts
  gradle/

native-engine/
  Cargo.toml
  src/
    lib.rs
    ffi/
      mod.rs
    navigation/
      bearing.rs
    sensors/
      mod.rs
    mapping/
      mod.rs
    sync/
      mod.rs
    safety/
      mod.rs
    utils/
      math.rs
```

Open decision: whether `native-engine/` is built by Gradle through a Rust Android plugin, a custom Gradle task invoking Cargo, or a separate local script.

## Phase 1 Kotlin Modules

The initial Android app should be organized around clear boundaries:

- `MainActivity`: entry point only.
- `navigation`: destination selection, current route state, distance display, AR overlay state.
- `location`: Android location permission and GPS update source.
- `nativebridge`: Kotlin wrapper around JNI functions exposed by Rust.
- `model`: small Kotlin data types for destination, current location, and overlay state.
- `ui`: normal screens and `SurfaceView` overlay host when implementation reaches rendering.
- `data`: temporary seed destination loader and later Room-backed repositories.

The UI should depend on a Kotlin `NativeNavigationEngine` wrapper, not raw JNI calls scattered across screens.

## Phase 1 Rust Modules

The native engine should start small and leave clear expansion points:

- `ffi/mod.rs`:
  - JNI functions and conversion only.
  - No navigation business logic embedded in JNI wrappers.
- `navigation/bearing.rs`:
  - Haversine distance.
  - Initial bearing.
  - Heading delta normalization.
  - Phase 1 complementary smoothing helper if sensor heading is available.
- `utils/math.rs`:
  - Angle normalization and interpolation helpers.
- `lib.rs`:
  - Module exports and minimal engine facade.

Do not implement EKF, PDR, offline queue, packet relay, or pathfinding in Phase 1 unless explicitly approved as a separate task.

## Phase 1 JNI Contract Draft

Prefer a tiny, stable Phase 1 surface instead of many fine-grained calls:

| Function | Direction | Purpose |
| --- | --- | --- |
| `nativeEngineVersion()` | Kotlin to Rust | Confirms library loads and returns version string. |
| `nativeDistanceMeters(lat1, lon1, lat2, lon2)` | Kotlin to Rust | Validates haversine math and JNI numeric bridge. |
| `nativeBearingDegrees(lat1, lon1, lat2, lon2)` | Kotlin to Rust | Computes compass bearing to destination. |
| `nativeOverlayState(lat1, lon1, heading, destLat, destLon)` | Kotlin to Rust | Returns encoded overlay state for Phase 1 UI. |

Open decision: return overlay state as primitive fields through multiple JNI calls, a Kotlin object constructed in JNI, a direct byte buffer, or protobuf/bincode bytes. For Phase 1, primitives or a compact string/byte payload are acceptable; later sensor loops should avoid object-heavy JNI paths.

## Android Permission Plan

Phase 1 needs only the minimum mobile permissions:

- Fine location for GPS navigation.
- Coarse location if Android grants approximate location.
- Notification, Bluetooth, nearby devices, SMS, and background permissions should remain out of Phase 1 unless a specific later feature is approved.

The app should degrade gracefully if location permission is denied by showing destination browsing without live navigation.

## Local Seed Data Plan

Until backend sync and official campus data exist, Phase 1 should use static seed data:

- One campus geofence placeholder, clearly marked temporary.
- A small list of destinations such as main gate, admin block, library, and one academic building.
- Lat/lon coordinates must be verified before real navigation demos.
- No seed data should pretend to be official if coordinates are estimated.

Recommended temporary format:

```json
{
  "destinations": [
    {
      "id": "main_gate",
      "label": "Main Gate",
      "category": "gate",
      "latitude": 0.0,
      "longitude": 0.0,
      "floor": 0,
      "temporary": true
    }
  ]
}
```

## Relationship To CLI 2

CLI 2 owns backend/data/admin planning. CLI 1 should request these contracts instead of editing backend plans directly:

- Auth token shape needed by Android.
- `GET /sync/manifest` response shape.
- `GET /map/locations` response shape.
- `GET /map/edges` response shape.
- Map version and sync cursor fields.
- Temporary seed data import/export format.

For Phase 1 mobile work, CLI 1 can proceed with local seed data while CLI 2 refines backend API contracts.

## Acceptance Criteria Before Phase 1 Implementation Starts

Before scaffolding, confirm:

- Android Studio or Gradle environment target.
- NDK version and Rust Android target setup approach.
- OSMDroid versus Mapbox.
- Normal screen UI toolkit.
- Package name.
- Initial seed destination source.
- Whether Phase 1 includes only GPS-to-bearing navigation or also simple line-on-map display.
- Whether the user wants Git commits after documentation and after scaffolding.

## Acceptance Criteria For Approved Phase 1 Implementation

Once implementation is explicitly approved, the Phase 1 mobile/native slice should be considered acceptable when:

- Android app builds on the local machine.
- Rust native library builds for at least one Android ABI first, then both required ABIs.
- Kotlin successfully loads the native library.
- A smoke call returns the native engine version.
- Rust unit tests validate distance and bearing math.
- Android screen can show current GPS coordinates when permission is granted.
- User can select a temporary destination.
- UI shows distance and bearing computed by Rust.
- Code avoids backend dependency for local navigation.
- `CODEX_HANDOFF.md` lists files touched, checks run, and remaining blockers.

## CLI 1 Phase 1 Closeout Status

| Criterion | Status | Evidence |
| --- | --- | --- |
| Android app scaffold exists | Done | `android-app/` with Gradle files, manifest, resources, Kotlin source, and seed assets |
| Rust native library scaffold exists | Done | `native-engine/` Cargo crate with navigation math and JNI exports |
| Kotlin native bridge exists | Done | `NativeNavigationEngine.kt` loads `campusar_native` and calls primitive JNI functions |
| Outdoor GPS navigation slice exists | Done | `MainActivity.kt` and `GpsLocationSource.kt` request location and compute overlay state when native library is packaged |
| Compass-style overlay foundation exists | Done | `CompassOverlaySurfaceView.kt` renders a directional arrow or arrival ring from overlay state |
| Rust distance/bearing tests pass | Done | `cargo test --manifest-path native-engine/Cargo.toml` passes 6 tests |
| Android build passes locally | Blocked | `gradle` command not found; no `ANDROID_HOME` or `ANDROID_SDK_ROOT` set |
| Android Rust targets build locally | Blocked | Installed Rust targets are host-only; Android SDK/NDK variables are not set |

## Blockers Before Implementation

- Confirm whether implementation may start or planning must continue only.
- Confirm Android package name.
- Confirm Android UI toolkit.
- Confirm map renderer.
- Confirm NDK/Rust build integration method.
- Confirm seed destination coordinates.
- Confirm whether a Git checkpoint commit is desired before scaffolding.

## Next Tasks For CLI 1

- Resolve the UI toolkit, map renderer, package name, and NDK integration choices.
- Draft exact Kotlin and Rust file list for scaffolding.
- Draft JNI function signatures.
- Draft Rust unit test cases for bearing and distance math.
- Wait for explicit approval before creating `android-app/` or `native-engine/`.
