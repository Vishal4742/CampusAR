# CampusAR Native Engine

This crate is the Phase 1 Rust foundation for CampusAR mobile navigation.

Current scope:

- Haversine distance.
- Initial bearing.
- Heading delta normalization.
- Proximity scale.
- Arrival flag.
- Primitive JNI exports for the Android app.

Out of scope for Phase 1:

- EKF.
- PDR.
- WiFi RSSI fingerprints.
- Magnetic fingerprints.
- Pathfinding.
- Offline queue.
- P2P relay packets.

## Local Checks

```powershell
cargo test --manifest-path native-engine/Cargo.toml
```

## Android Build

Android targets require Android SDK/NDK and Rust Android targets. After those are installed, run:

```powershell
native-engine\scripts\build-android.ps1
```

The script copies produced shared libraries into:

```text
android-app/app/src/main/jniLibs/
```
