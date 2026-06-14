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
    private var currentMotionState: Int = MOTION_STATE_UNKNOWN
    private var currentDelay: Int = SensorManager.SENSOR_DELAY_UI

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

        registerWithDelay(currentDelay)
        onStatus("Sensor stream active at ${motionStateName(currentMotionState)} rate.")
    }

    fun setMotionState(motionState: Int) {
        if (motionState == currentMotionState || listener == null) {
            currentMotionState = motionState
            return
        }
        currentMotionState = motionState
        val newDelay = delayForMotionState(motionState)
        if (newDelay != currentDelay) {
            currentDelay = newDelay
            registerWithDelay(currentDelay)
        }
    }

    private fun registerWithDelay(delay: Int) {
        listener?.let { currentListener ->
            sensorManager.unregisterListener(currentListener)
            SENSOR_TYPES.mapNotNull { type ->
                sensorManager.getDefaultSensor(type)
            }.forEach { sensor ->
                sensorManager.registerListener(currentListener, sensor, delay)
            }
        }
    }

    private fun delayForMotionState(motionState: Int): Int = when (motionState) {
        MOTION_STATE_IDLE    -> SensorManager.SENSOR_DELAY_NORMAL
        MOTION_STATE_WALKING -> SensorManager.SENSOR_DELAY_GAME
        MOTION_STATE_ACTIVE  -> SensorManager.SENSOR_DELAY_FASTEST
        else                 -> SensorManager.SENSOR_DELAY_UI
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

    companion object {
        const val MOTION_STATE_UNKNOWN = 0
        const val MOTION_STATE_IDLE    = 1
        const val MOTION_STATE_WALKING = 2
        const val MOTION_STATE_ACTIVE  = 3

        fun motionStateName(state: Int): String = when (state) {
            MOTION_STATE_IDLE    -> "idle"
            MOTION_STATE_WALKING -> "walking"
            MOTION_STATE_ACTIVE  -> "active"
            else                 -> "unknown"
        }

        val SENSOR_TYPES = listOf(
            Sensor.TYPE_ACCELEROMETER,
            Sensor.TYPE_GYROSCOPE,
            Sensor.TYPE_MAGNETIC_FIELD,
            Sensor.TYPE_PRESSURE,
        )
    }
}
