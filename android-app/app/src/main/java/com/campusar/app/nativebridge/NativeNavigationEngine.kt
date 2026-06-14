package com.campusar.app.nativebridge

import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.NavigationOverlayState

class NativeNavigationEngine {
    val nativeReady: Boolean = runCatching {
        System.loadLibrary(LIBRARY_NAME)
    }.isSuccess

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

    external fun nativePositionInit(lat: Double, lon: Double, heading: Double)
    external fun nativePositionUpdateGps(lat: Double, lon: Double, accuracyMeters: Double, epochMillis: Long)
    external fun nativePositionUpdatePdr(headingDegrees: Double, stepLengthMeters: Double, stepCount: Int)
    external fun nativePositionLatitude(): Double
    external fun nativePositionLongitude(): Double
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

    private inline fun <T> callNative(block: () -> T): T? {
        if (!nativeReady) {
            return null
        }

        return runCatching(block).getOrNull()
    }

    private companion object {
        const val LIBRARY_NAME = "campusar_native"
        const val MOTION_STATE_UNKNOWN = 0
        const val DEFAULT_STEP_LENGTH_METERS = 0.72
    }
}
