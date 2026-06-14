package com.campusar.app.nativebridge

import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.NavigationOverlayState

class NativeNavigationEngine {
    val nativeReady: Boolean = runCatching {
        System.loadLibrary(LIBRARY_NAME)
    }.isSuccess

    // ===== Engine basics =====

    external fun nativeEngineVersionCode(): Int
    external fun nativeDistanceMeters(
        originLatitude: Double,
        originLongitude: Double,
        destinationLatitude: Double,
        destinationLongitude: Double,
    ): Double

    external fun nativeBearingDegrees(
        originLatitude: Double,
        originLongitude: Double,
        destinationLatitude: Double,
        destinationLongitude: Double,
    ): Double

    external fun nativeHeadingDeltaDegrees(
        currentHeadingDegrees: Double,
        targetBearingDegrees: Double,
    ): Double

    external fun nativeProximityScale(distanceMeters: Double): Double
    external fun nativeArrivalReached(distanceMeters: Double): Boolean
    external fun nativeSmoothHeadingDegrees(
        previousHeadingDegrees: Double,
        measuredHeadingDegrees: Double,
        responsiveness: Double,
    ): Double

    external fun nativeHeadingConfidence(sensorAccuracy: Int): Double
    external fun nativeAccelerationDeltaFromGravity(x: Double, y: Double, z: Double): Double
    external fun nativeGyroMagnitude(x: Double, y: Double, z: Double): Double
    external fun nativeMotionState(
        accelerationDeltaFromGravity: Double,
        gyroMagnitudeRadiansPerSecond: Double,
    ): Int

    external fun nativeEstimatedStepLengthMeters(userHeightMeters: Double, motionState: Int): Double
    external fun nativeDeadReckonNorthMeters(
        headingDegrees: Double,
        stepLengthMeters: Double,
        stepCount: Int,
    ): Double

    external fun nativeDeadReckonEastMeters(
        headingDegrees: Double,
        stepLengthMeters: Double,
        stepCount: Int,
    ): Double

    // ===== Position fusion (Phase 1) =====

    external fun nativePositionInit(lat: Double, lon: Double, heading: Double)
    external fun nativePositionUpdateGps(lat: Double, lon: Double, accuracyMeters: Double, epochMillis: Long)
    external fun nativePositionUpdatePdr(headingDegrees: Double, stepLengthMeters: Double, stepCount: Int)
    external fun nativePositionLatitude(): Double
    external fun nativePositionLongitude(): Double

    // ===== Graph / pathfinding =====

    external fun nativeGraphClear()
    external fun nativeGraphAddNode(lat: Double, lon: Double, floor: Int): Int
    external fun nativeGraphAddEdge(
        from: Int,
        to: Int,
        distance: Double,
        bidirectional: Boolean,
        wheelchair: Boolean,
        floorTransition: Boolean,
    )

    external fun nativeGraphNodeCount(): Int
    external fun nativeGraphEdgeCount(): Int
    external fun nativeGraphFindPath(start: Int, goal: Int, wheelchairOnly: Boolean): Int
    external fun nativeGraphPathNodeAt(index: Int): Int
    external fun nativeGraphPathDistance(): Double

    // ===== EKF =====

    external fun nativeEkfInit(lat: Double, lon: Double, heading: Double, floor: Int)

    external fun nativeEkfPredict(headingDeg: Double, stepLengthM: Double, dtSeconds: Double)

    external fun nativeEkfUpdateGps(lat: Double, lon: Double, accuracyM: Double)

    external fun nativeEkfUpdateHeading(headingDeg: Double, confidence: Double)

    external fun nativeEkfUpdateWifiPosition(lat: Double, lon: Double, confidence: Double)

    external fun nativeEkfUpdateMagneticPosition(lat: Double, lon: Double, confidence: Double)

    external fun nativeEkfUpdateFloor(floorIndex: Int)

    external fun nativeEkfLatitude(): Double
    external fun nativeEkfLongitude(): Double
    external fun nativeEkfHeading(): Double
    external fun nativeEkfFloor(): Int
    external fun nativeEkfVelocity(): Double

    // ===== WiFi fingerprint DB =====

    external fun nativeWifiDbClear()
    external fun nativeWifiDbAddFingerprint(id: Int, lat: Double, lon: Double, floor: Int, bssidHashesPtr: Long, rssiPtr: Long, count: Int)
    external fun nativeWifiDbMatch(bssidHashesPtr: Long, rssiPtr: Long, count: Int, k: Int): Int
    external fun nativeWifiMatchLatitude(): Double
    external fun nativeWifiMatchLongitude(): Double
    external fun nativeWifiMatchFloor(): Int
    external fun nativeWifiMatchConfidence(): Double

    // ===== Magnetic fingerprint DB =====

    external fun nativeMagneticDbClear()
    external fun nativeMagneticDbAddFingerprint(id: Int, lat: Double, lon: Double, floor: Int, fx: Double, fy: Double, fz: Double)
    external fun nativeMagneticDbMatch(fx: Double, fy: Double, fz: Double, k: Int): Int
    external fun nativeMagneticMatchLatitude(): Double
    external fun nativeMagneticMatchLongitude(): Double
    external fun nativeMagneticMatchFloor(): Int
    external fun nativeMagneticMatchConfidence(): Double

    // ===== Barometer floor detection =====

    external fun nativeFloorDetectorClear()
    external fun nativeFloorDetectorAddProfile(floorIndex: Int, refPressureHpa: Double, relAltMeters: Double)
    external fun nativeFloorDetectorUpdate(pressureHpa: Double): Int

    // ===== Sampling controller =====

    external fun nativeSamplingRecommendedIntervalNanos(): Long
    external fun nativeSamplingShouldSample(currentNanos: Long): Byte
    external fun nativeSamplingSetMotionState(state: Int)
    external fun nativeSamplingSetScreenOn(on: Byte)
    external fun nativeSamplingSetNavigationActive(active: Byte)

    // ================================================================
    //  Safe Kotlin wrapper methods
    // ================================================================

    fun engineVersionCodeOrNull(): Int? {
        return callNative { nativeEngineVersionCode() }
    }

    fun overlayStateOrNull(
        currentPoint: GeoPoint,
        headingDegrees: Double,
        destination: Destination,
    ): NavigationOverlayState? {
        if (!nativeReady) {
            return null
        }

        val distanceMeters = nativeDistanceMeters(
            currentPoint.latitude,
            currentPoint.longitude,
            destination.point.latitude,
            destination.point.longitude,
        )
        val bearingDegrees = nativeBearingDegrees(
            currentPoint.latitude,
            currentPoint.longitude,
            destination.point.latitude,
            destination.point.longitude,
        )

        return NavigationOverlayState(
            distanceMeters = distanceMeters,
            bearingDegrees = bearingDegrees,
            headingDeltaDegrees = nativeHeadingDeltaDegrees(headingDegrees, bearingDegrees),
            proximityScale = nativeProximityScale(distanceMeters),
            arrival = nativeArrivalReached(distanceMeters),
        )
    }

    fun smoothHeadingOrFallback(
        previousHeadingDegrees: Double,
        measuredHeadingDegrees: Double,
        responsiveness: Double,
    ): Double {
        return callNative {
            nativeSmoothHeadingDegrees(
                previousHeadingDegrees,
                measuredHeadingDegrees,
                responsiveness,
            )
        } ?: measuredHeadingDegrees
    }

    fun headingConfidenceOrZero(sensorAccuracy: Int): Double {
        return callNative { nativeHeadingConfidence(sensorAccuracy) } ?: 0.0
    }

    fun accelerationDeltaFromGravityOrNull(x: Float, y: Float, z: Float): Double? {
        return callNative {
            nativeAccelerationDeltaFromGravity(x.toDouble(), y.toDouble(), z.toDouble())
        }
    }

    fun gyroMagnitudeOrNull(x: Float, y: Float, z: Float): Double? {
        return callNative {
            nativeGyroMagnitude(x.toDouble(), y.toDouble(), z.toDouble())
        }
    }

    fun motionStateOrUnknown(
        accelerationDeltaFromGravity: Double,
        gyroMagnitudeRadiansPerSecond: Double,
    ): Int {
        return callNative {
            nativeMotionState(accelerationDeltaFromGravity, gyroMagnitudeRadiansPerSecond)
        } ?: MOTION_STATE_UNKNOWN
    }

    fun estimatedStepLengthMetersOrDefault(userHeightMeters: Double, motionState: Int): Double {
        return callNative {
            nativeEstimatedStepLengthMeters(userHeightMeters, motionState)
        } ?: DEFAULT_STEP_LENGTH_METERS
    }

    // -- Phase 1 position fusion wrappers --

    fun initPosition(lat: Double, lon: Double, heading: Double) {
        callNative { nativePositionInit(lat, lon, heading) }
    }

    fun updatePositionGps(lat: Double, lon: Double, accuracyMeters: Double, epochMillis: Long) {
        callNative { nativePositionUpdateGps(lat, lon, accuracyMeters, epochMillis) }
    }

    fun updatePositionPdr(headingDegrees: Double, stepLengthMeters: Double, stepCount: Int) {
        callNative { nativePositionUpdatePdr(headingDegrees, stepLengthMeters, stepCount) }
    }

    fun estimatedLatitudeOrNull(): Double? {
        val lat = callNative { nativePositionLatitude() } ?: return null
        return if (lat.isFinite()) lat else null
    }

    fun estimatedLongitudeOrNull(): Double? {
        val lon = callNative { nativePositionLongitude() } ?: return null
        return if (lon.isFinite()) lon else null
    }

    fun deadReckonDeltaOrNull(
        headingDegrees: Double,
        stepLengthMeters: Double,
        stepCount: Int,
    ): Pair<Double, Double>? {
        val north = callNative {
            nativeDeadReckonNorthMeters(headingDegrees, stepLengthMeters, stepCount)
        }
        val east = callNative {
            nativeDeadReckonEastMeters(headingDegrees, stepLengthMeters, stepCount)
        }
        if (north == null || east == null) {
            return null
        }
        return north to east
    }

    // ===== EKF wrappers =====

    fun initEkf(lat: Double, lon: Double, heading: Double, floor: Int) {
        callNative { nativeEkfInit(lat, lon, heading, floor) }
    }

    fun ekfPredict(headingDeg: Double, stepLengthM: Double, dtSeconds: Double) {
        callNative { nativeEkfPredict(headingDeg, stepLengthM, dtSeconds) }
    }

    fun ekfUpdateGps(lat: Double, lon: Double, accuracyM: Double) {
        callNative { nativeEkfUpdateGps(lat, lon, accuracyM) }
    }

    fun ekfUpdateHeading(headingDeg: Double, confidence: Double) {
        callNative { nativeEkfUpdateHeading(headingDeg, confidence) }
    }

    fun ekfUpdateWifiPosition(lat: Double, lon: Double, confidence: Double) {
        callNative { nativeEkfUpdateWifiPosition(lat, lon, confidence) }
    }

    fun ekfUpdateMagneticPosition(lat: Double, lon: Double, confidence: Double) {
        callNative { nativeEkfUpdateMagneticPosition(lat, lon, confidence) }
    }

    fun ekfUpdateFloor(floorIndex: Int) {
        callNative { nativeEkfUpdateFloor(floorIndex) }
    }

    fun ekfLatitudeOrNull(): Double? {
        val lat = callNative { nativeEkfLatitude() } ?: return null
        return if (lat.isFinite()) lat else null
    }

    fun ekfLongitudeOrNull(): Double? {
        val lon = callNative { nativeEkfLongitude() } ?: return null
        return if (lon.isFinite()) lon else null
    }

    fun ekfHeadingOrNaN(): Double {
        return callNative { nativeEkfHeading() } ?: Double.NaN
    }

    fun ekfFloorOrDefault(default: Int): Int {
        return callNative { nativeEkfFloor() } ?: default
    }

    fun ekfVelocityOrNaN(): Double {
        return callNative { nativeEkfVelocity() } ?: Double.NaN
    }

    // ===== WiFi fingerprint DB wrappers =====

    fun wifiDbClear() {
        callNative { nativeWifiDbClear() }
    }

    fun wifiDbAddFingerprint(id: Int, lat: Double, lon: Double, floor: Int, bssidHashesPtr: Long, rssiPtr: Long, count: Int) {
        callNative { nativeWifiDbAddFingerprint(id, lat, lon, floor, bssidHashesPtr, rssiPtr, count) }
    }

    fun wifiDbMatch(bssidHashesPtr: Long, rssiPtr: Long, count: Int, k: Int): Int? {
        return callNative { nativeWifiDbMatch(bssidHashesPtr, rssiPtr, count, k) }?.takeIf { it >= 0 }
    }

    fun wifiMatchPositionOrNull(): Quadruple? {
        val lat = callNative { nativeWifiMatchLatitude() } ?: return null
        val lon = callNative { nativeWifiMatchLongitude() } ?: return null
        val floor = callNative { nativeWifiMatchFloor() } ?: return null
        val conf = callNative { nativeWifiMatchConfidence() } ?: return null
        if (!lat.isFinite() || !lon.isFinite()) return null
        return Quadruple(lat, lon, floor, conf)
    }

    // ===== Magnetic fingerprint DB wrappers =====

    fun magneticDbClear() {
        callNative { nativeMagneticDbClear() }
    }

    fun magneticDbAddFingerprint(id: Int, lat: Double, lon: Double, floor: Int, fx: Double, fy: Double, fz: Double) {
        callNative { nativeMagneticDbAddFingerprint(id, lat, lon, floor, fx, fy, fz) }
    }

    fun magneticDbMatch(fx: Double, fy: Double, fz: Double, k: Int): Int? {
        return callNative { nativeMagneticDbMatch(fx, fy, fz, k) }?.takeIf { it >= 0 }
    }

    fun magneticMatchPositionOrNull(): Quadruple? {
        val lat = callNative { nativeMagneticMatchLatitude() } ?: return null
        val lon = callNative { nativeMagneticMatchLongitude() } ?: return null
        val floor = callNative { nativeMagneticMatchFloor() } ?: return null
        val conf = callNative { nativeMagneticMatchConfidence() } ?: return null
        if (!lat.isFinite() || !lon.isFinite()) return null
        return Quadruple(lat, lon, floor, conf)
    }

    // ===== Barometer floor detection wrappers =====

    fun floorDetectorClear() {
        callNative { nativeFloorDetectorClear() }
    }

    fun floorDetectorAddProfile(floorIndex: Int, refPressureHpa: Double, relAltMeters: Double) {
        callNative { nativeFloorDetectorAddProfile(floorIndex, refPressureHpa, relAltMeters) }
    }

    fun floorDetectorUpdate(pressureHpa: Double): Int? {
        val floor = callNative { nativeFloorDetectorUpdate(pressureHpa) }
        return floor
    }

    // ===== Sampling controller wrappers =====

    fun samplingRecommendedIntervalNanos(): Long? {
        return callNative { nativeSamplingRecommendedIntervalNanos() }
    }

    fun samplingShouldSample(currentNanos: Long): Boolean {
        return callNative { nativeSamplingShouldSample(currentNanos) }?.let { it.toInt() != 0 } ?: true
    }

    fun samplingSetMotionState(state: Int) {
        callNative { nativeSamplingSetMotionState(state) }
    }

    fun samplingSetScreenOn(on: Boolean) {
        callNative { nativeSamplingSetScreenOn(if (on) 1 else 0) }
    }

    fun samplingSetNavigationActive(active: Boolean) {
        callNative { nativeSamplingSetNavigationActive(if (active) 1 else 0) }
    }

    private inline fun <T> callNative(block: () -> T): T? {
        if (!nativeReady) {
            return null
        }

        return runCatching(block).getOrNull()
    }

    data class Quadruple(
        val latitude: Double,
        val longitude: Double,
        val floorIndex: Int,
        val confidence: Double,
    )

    private companion object {
        const val LIBRARY_NAME = "campusar_native"
        const val MOTION_STATE_UNKNOWN = 0
        const val DEFAULT_STEP_LENGTH_METERS = 0.72
    }
}
