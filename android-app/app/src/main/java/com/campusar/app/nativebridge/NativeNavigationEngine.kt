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

    private inline fun <T> callNative(block: () -> T): T? {
        if (!nativeReady) {
            return null
        }

        return runCatching(block).getOrNull()
    }

    private companion object {
        const val LIBRARY_NAME = "campusar_native"
    }
}
