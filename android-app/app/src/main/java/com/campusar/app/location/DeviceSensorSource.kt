package com.campusar.app.location

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import com.campusar.app.model.SensorAvailability
import com.campusar.app.model.SensorReading
import com.campusar.app.model.SensorSnapshot

class DeviceSensorSource(private val context: Context) {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var listener: SensorEventListener? = null
    private var snapshot = SensorSnapshot()

    fun availability(): SensorAvailability {
        return SensorAvailability(
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null,
            gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null,
            magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null,
            barometer = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE) != null,
        )
    }

    fun start(
        onSnapshot: (SensorSnapshot) -> Unit,
        onStatus: (String) -> Unit,
    ) {
        stop()

        listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val reading = event.toReading()
                snapshot = when (event.sensor.type) {
                    Sensor.TYPE_ACCELEROMETER -> snapshot.copy(accelerometer = reading)
                    Sensor.TYPE_GYROSCOPE -> snapshot.copy(gyroscope = reading)
                    Sensor.TYPE_MAGNETIC_FIELD -> snapshot.copy(magnetometer = reading)
                    Sensor.TYPE_PRESSURE -> snapshot.copy(barometer = reading)
                    else -> snapshot
                }
                onSnapshot(snapshot)
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }

        val registered = SENSOR_TYPES.mapNotNull { type ->
            sensorManager.getDefaultSensor(type)
        }.count { sensor ->
            sensorManager.registerListener(
                listener,
                sensor,
                SensorManager.SENSOR_DELAY_GAME,
            )
        }

        onStatus("Sensor stream: $registered sources active.")
    }

    fun stop() {
        listener?.let { currentListener ->
            sensorManager.unregisterListener(currentListener)
        }
        listener = null
    }

    private fun SensorEvent.toReading(): SensorReading {
        return SensorReading(
            sensorType = sensor.type,
            timestampNanos = timestamp,
            elapsedRealtimeNanos = SystemClock.elapsedRealtimeNanos(),
            accuracy = accuracy,
            x = values.getOrElse(0) { 0f },
            y = values.getOrElse(1) { 0f },
            z = values.getOrElse(2) { 0f },
        )
    }

    private companion object {
        val SENSOR_TYPES = listOf(
            Sensor.TYPE_ACCELEROMETER,
            Sensor.TYPE_GYROSCOPE,
            Sensor.TYPE_MAGNETIC_FIELD,
            Sensor.TYPE_PRESSURE,
        )
    }
}
