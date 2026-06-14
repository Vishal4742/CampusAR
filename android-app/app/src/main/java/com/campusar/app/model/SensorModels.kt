package com.campusar.app.model

data class SensorSnapshot(
    val accelerometer: SensorReading? = null,
    val gyroscope: SensorReading? = null,
    val magnetometer: SensorReading? = null,
    val barometer: SensorReading? = null,
)

data class SensorReading(
    val sensorType: Int,
    val timestampNanos: Long,
    val elapsedRealtimeNanos: Long,
    val accuracy: Int,
    val x: Float,
    val y: Float,
    val z: Float,
)

data class SensorAvailability(
    val accelerometer: Boolean,
    val gyroscope: Boolean,
    val magnetometer: Boolean,
    val barometer: Boolean,
)
