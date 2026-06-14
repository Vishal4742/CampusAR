# CampusAR Android App

This is the Phase 1 Android scaffold owned by CLI 1.

Current scope:

- Plain Android Views.
- GPS permission and location flow.
- Seed destination loader from app assets.
- Kotlin wrapper around Rust JNI primitives.
- Compass-style `SurfaceView` overlay foundation.
- Phase 2 field survey mode for saving GPS points, recording walked route samples, and exporting survey JSON.

Out of scope for this scaffold:

- Backend auth integration.
- Room database.
- Offline tile cache.
- OSMDroid or Mapbox map rendering.
- Direct backend upload of survey data.
- BLE, WiFi Direct, and Nearby Connections.
- SOS, gamification, buddy tracking, faculty availability, and admin UI.

## Field Survey Mode

The app can collect provisional OCT mapping data without photos or backend access:

- enable location
- save the current GPS point with label, category, and notes
- start and stop a walked route
- export a `campusar_survey_<timestamp>.json` file through Android's document picker

The exported JSON uses `campusStableKey: "oct-bhopal"` and `coordinateStatus: "field_collected"`. Treat this as seed input for backend/admin review, not final verified navigation data.

## Local Android Build

This workspace has a local toolchain installed under `C:\tmp\campusar-toolchain`.

In PowerShell:

```powershell
.\scripts\use-android-toolchain.ps1
.\native-engine\scripts\build-android.ps1
cd android-app
gradle :app:assembleDebug
```

## Native Verification

The Rust core can be verified without Android SDK:

```powershell
cargo test --manifest-path ..\native-engine\Cargo.toml
```

## Native Library Packaging

After Android SDK/NDK and Rust Android targets are available, run:

```powershell
..\native-engine\scripts\build-android.ps1
```

That script copies `libcampusar_native.so` into `app/src/main/jniLibs/`.
