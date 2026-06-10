package com.campusar.app.model

data class NavigationOverlayState(
    val distanceMeters: Double,
    val bearingDegrees: Double,
    val headingDeltaDegrees: Double,
    val proximityScale: Double,
    val arrival: Boolean,
)
