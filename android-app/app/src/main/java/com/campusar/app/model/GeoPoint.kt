package com.campusar.app.model

data class GeoPoint(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float? = null,
    val capturedAtEpochMillis: Long = System.currentTimeMillis(),
)
