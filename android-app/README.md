# CampusAR Android App

This is the Phase 1 Android scaffold owned by CLI 1.

Current scope:

- Plain Android Views.
- GPS permission and location flow.
- Seed destination loader from app assets.
- Kotlin wrapper around Rust JNI primitives.
- Compass-style `SurfaceView` overlay foundation.

Out of scope for this scaffold:

- Backend auth integration.
- Room database.
- Offline tile cache.
- OSMDroid or Mapbox map rendering.
- BLE, WiFi Direct, and Nearby Connections.
- SOS, gamification, buddy tracking, faculty availability, and admin UI.

## Local Android Build

This requires Android SDK, Gradle, and the Android Gradle Plugin dependencies:

```powershell
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
