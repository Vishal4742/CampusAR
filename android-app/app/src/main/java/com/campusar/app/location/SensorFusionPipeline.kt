package com.campusar.app.location

import android.util.Log
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.SensorSnapshot
import com.campusar.app.nativebridge.NativeNavigationEngine
import kotlin.math.abs
import kotlin.math.sqrt

enum class PositionSource { GPS, PDR, WIFI, MAGNETIC, QR_SNAP, FUSED }

data class FusedPosition(
    val latitude: Double,
    val longitude: Double,
    val headingDegrees: Double,
    val floorIndex: Int,
    val velocityMps: Double,
    val source: PositionSource,
    val timestamp: Long,
)

class SensorFusionPipeline(
    private val native: NativeNavigationEngine,
    private val wifiScanner: WifiScanSource,
    private val sensorSource: DeviceSensorSource,
) {
    private var onPosition: ((FusedPosition) -> Unit)? = null
    private var onStatus: ((String) -> Unit)? = null
    private var running = false

    // Step detection state
    private var previousAccelDelta: Double = 0.0
    private var stepCount: Int = 0
    private var lastStepTimeNanos: Long = 0L
    private var lastPdrTimeNanos: Long = 0L

    // Heading
    private var smoothedHeadingDegrees: Double = 0.0
    private var previousAccelX: Float = 0f
    private var previousAccelY: Float = 0f
    private var previousAccelZ: Float = 0f
    private var hasPreviousAccel: Boolean = false

    // EKF initialisation
    private var ekfInitialised: Boolean = false
    private var headingInitialised: Boolean = false
    private var currentFloor: Int = 0

    // Magnetic matching throttle (match at most once per 2 seconds)
    private var lastMagneticMatchMillis: Long = 0L

    // WiFi matching throttle (match at most once per 5 seconds)
    private var lastWifiMatchMillis: Long = 0L

    fun start(
        onPosition: (FusedPosition) -> Unit,
        onStatus: (String) -> Unit,
    ) {
        this.onPosition = onPosition
        this.onStatus = onStatus
        running = true
    }

    fun stop() {
        running = false
    }

    /**
     * Called from GpsLocationSource whenever a new GPS point arrives.
     */
    fun onGpsUpdate(point: GeoPoint) {
        if (!running) return

        if (!ekfInitialised) {
            val heading = if (headingInitialised) smoothedHeadingDegrees else 0.0
            native.initEkf(point.latitude, point.longitude, heading, currentFloor)
            ekfInitialised = true
            onStatus?.invoke("EKF initialised from GPS fix.")
        }

        val accuracy = point.accuracyMeters?.toDouble() ?: 10.0
        native.ekfUpdateGps(point.latitude, point.longitude, accuracy)

        emitFused(PositionSource.GPS, point.capturedAtEpochMillis)
    }

    /**
     * Called from QrAnchorScanner when a QR anchor is scanned.
     */
    fun onQrSnap(event: QrSnapEvent) {
        if (!running) return

        currentFloor = event.floorIndex
        native.initEkf(event.latitude, event.longitude, smoothedHeadingDegrees, currentFloor)
        ekfInitialised = true
        emitFused(PositionSource.QR_SNAP, event.timestamp)
        onStatus?.invoke("Position snapped to QR anchor ${event.codeKey}.")
    }

    /**
     * Called from DeviceSensorSource on every sensor frame.
     */
    fun onSensorSnapshot(snapshot: SensorSnapshot) {
        if (!running || !ekfInitialised) return

        val accel = snapshot.accelerometer
        val gyro = snapshot.gyroscope
        val magnetometer = snapshot.magnetometer
        val barometer = snapshot.barometer

        // --- Motion state ---
        val accelDelta = accel?.let { acc ->
            native.accelerationDeltaFromGravityOrNull(acc.x, acc.y, acc.z)
        } ?: 0.0

        val gyroMag = gyro?.let { g ->
            native.gyroMagnitudeOrNull(g.x, g.y, g.z)
        } ?: 0.0

        val motionState = native.motionStateOrUnknown(accelDelta, gyroMag)
        native.samplingSetMotionState(motionState)
        sensorSource.setMotionState(motionState)

        // --- Complementary heading from magnetometer ---
        if (magnetometer != null && accel != null) {
            val heading = computeComplementaryHeading(
                magnetometer.x, magnetometer.y, magnetometer.z,
                accel.x, accel.y, accel.z,
            )
            if (heading.isFinite()) {
                if (!headingInitialised) {
                    smoothedHeadingDegrees = heading
                    headingInitialised = true
                } else {
                    smoothedHeadingDegrees = native.smoothHeadingOrFallback(
                        smoothedHeadingDegrees,
                        heading,
                        HEADING_RESPONSIVENESS,
                    )
                }
                val confidence = native.headingConfidenceOrZero(magnetometer.accuracy)
                native.ekfUpdateHeading(smoothedHeadingDegrees, confidence)
            }
        }

        // --- Step detection + PDR ---
        val currentTimeNanos = System.nanoTime()
        if (accel != null && hasPreviousAccel) {
            val stepDetected = native.accelerationDeltaFromGravityOrNull(accel.x, accel.y, accel.z)
                ?: 0.0

            // Simple threshold-crossing step detection
            val accelerationMagnitude = sqrt(
                (accel.x - previousAccelX).toDouble().let { it * it } +
                (accel.y - previousAccelY).toDouble().let { it * it } +
                (accel.z - previousAccelZ).toDouble().let { it * it },
            )

            if (accelerationMagnitude > STEP_THRESHOLD_MAGNITUDE &&
                currentTimeNanos - lastStepTimeNanos > STEP_COOLDOWN_NANOS
            ) {
                stepCount++
                lastStepTimeNanos = currentTimeNanos

                val stepLength = native.estimatedStepLengthMetersOrDefault(
                    DEFAULT_USER_HEIGHT, motionState,
                )
                val dtSeconds = if (lastPdrTimeNanos > 0) {
                    (currentTimeNanos - lastPdrTimeNanos) / 1_000_000_000.0
                } else {
                    0.5
                }
                dtSeconds.coerceIn(0.1, 2.0)

                native.ekfPredict(smoothedHeadingDegrees, stepLength, dtSeconds)
                lastPdrTimeNanos = currentTimeNanos

                if (motionState >= DeviceSensorSource.MOTION_STATE_WALKING) {
                    emitFused(PositionSource.PDR, System.currentTimeMillis())
                }
            }
        }
        if (accel != null) {
            previousAccelX = accel.x
            previousAccelY = accel.y
            previousAccelZ = accel.z
            hasPreviousAccel = true
        }

        // --- Barometer floor detection ---
        if (barometer != null) {
            val pressure = barometer.z // Pressure in hPa comes in Z value
            val newFloor = native.floorDetectorUpdate(pressure.toDouble())
            if (newFloor != null && newFloor != currentFloor) {
                currentFloor = newFloor
                native.ekfUpdateFloor(currentFloor)
                onStatus?.invoke("Floor changed: $currentFloor")
            }
        }

        // --- Magnetic fingerprint matching ---
        if (magnetometer != null) {
            val now = System.currentTimeMillis()
            if (now - lastMagneticMatchMillis > MAGNETIC_MATCH_INTERVAL_MILLIS) {
                val matchCount = native.magneticDbMatch(
                    magnetometer.x.toDouble(),
                    magnetometer.y.toDouble(),
                    magnetometer.z.toDouble(),
                    MAGNETIC_K_NEAREST,
                )
                if (matchCount != null && matchCount > 0) {
                    val pos = native.magneticMatchPositionOrNull()
                    if (pos != null && pos.confidence >= MAGNETIC_MIN_CONFIDENCE) {
                        native.ekfUpdateMagneticPosition(pos.latitude, pos.longitude, pos.confidence)
                        lastMagneticMatchMillis = now
                    }
                }
            }
        }

        // Update sampling controller
        val shouldSample = native.samplingShouldSample(currentTimeNanos)
        if (!shouldSample && motionState == DeviceSensorSource.MOTION_STATE_IDLE) {
            // Skip further processing this frame
            return
        }

        // Emit fused position periodically
        if (currentTimeNanos - lastPdrTimeNanos > FUSED_EMIT_INTERVAL_NANOS) {
            emitFused(PositionSource.FUSED, System.currentTimeMillis())
        }
    }

    /**
     * Called when a WiFi scan result arrives.
     */
    fun onWifiScanSnapshot(snapshot: WifiScanSnapshot) {
        if (!running || !ekfInitialised) return

        val now = System.currentTimeMillis()
        if (now - lastWifiMatchMillis < WIFI_MATCH_INTERVAL_MILLIS) return

        if (snapshot.results.size < MIN_WIFI_APS) return

        // Pack hashes and RSSI into direct buffers
        val count = snapshot.results.size
        val hashBuffer = java.nio.ByteBuffer.allocateDirect(count * 8).order(java.nio.ByteOrder.nativeOrder())
        val rssiBuffer = java.nio.ByteBuffer.allocateDirect(count * 4).order(java.nio.ByteOrder.nativeOrder())

        for (result in snapshot.results) {
            hashBuffer.putLong(result.bssidHash)
            rssiBuffer.putInt(result.rssiDbm)
        }
        hashBuffer.flip()
        rssiBuffer.flip()

        val hashPtr = directBufferAddress(hashBuffer)
        val rssiPtr = directBufferAddress(rssiBuffer)

        val matchCount = native.wifiDbMatch(hashPtr, rssiPtr, count, WIFI_K_NEAREST)
        if (matchCount != null && matchCount > 0) {
            val pos = native.wifiMatchPositionOrNull()
            if (pos != null && pos.confidence >= WIFI_MIN_CONFIDENCE) {
                native.ekfUpdateWifiPosition(pos.latitude, pos.longitude, pos.confidence)
                lastWifiMatchMillis = now
                emitFused(PositionSource.WIFI, System.currentTimeMillis())
            }
        }
    }

    private fun emitFused(source: PositionSource, timestamp: Long) {
        val lat = native.ekfLatitudeOrNull() ?: return
        val lon = native.ekfLongitudeOrNull() ?: return
        val heading = native.ekfHeadingOrNaN().takeIf { it.isFinite() } ?: smoothedHeadingDegrees
        val floor = native.ekfFloorOrDefault(currentFloor)
        val velocity = native.ekfVelocityOrNaN().takeIf { it.isFinite() } ?: 0.0

        onPosition?.invoke(
            FusedPosition(
                latitude = lat,
                longitude = lon,
                headingDegrees = heading,
                floorIndex = floor,
                velocityMps = velocity,
                source = source,
                timestamp = timestamp,
            ),
        )
    }

    /**
     * Compute heading from magnetometer + accelerometer using tilt compensation.
     */
    private fun computeComplementaryHeading(
        magX: Float, magY: Float, magZ: Float,
        accelX: Float, accelY: Float, accelZ: Float,
    ): Double {
        // Roll and pitch from accelerometer
        val roll = kotlin.math.atan2(accelY.toDouble(), accelZ.toDouble())
        val pitch = kotlin.math.atan2(
            -accelX.toDouble(),
            sqrt(accelY.toDouble() * accelY.toDouble() + accelZ.toDouble() * accelZ.toDouble()),
        )

        // Tilt-compensated magnetometer readings
        val sinRoll = kotlin.math.sin(roll)
        val cosRoll = kotlin.math.cos(roll)
        val sinPitch = kotlin.math.sin(pitch)
        val cosPitch = kotlin.math.cos(pitch)

        val magXComp = (magX.toDouble() * cosPitch +
                magZ.toDouble() * sinPitch)
        val magYComp = (magX.toDouble() * sinRoll * sinPitch +
                magY.toDouble() * cosRoll -
                magZ.toDouble() * sinRoll * cosPitch)

        // Magnetic heading in degrees
        val heading = Math.toDegrees(kotlin.math.atan2(-magYComp, magXComp))
        return (heading + 360.0) % 360.0
    }

    private fun directBufferAddress(buffer: java.nio.ByteBuffer): Long {
        return try {
            val field = java.nio.Buffer::class.java.getDeclaredField("address")
            field.isAccessible = true
            field.getLong(buffer)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to get direct buffer address: ${e.message}")
            0L
        }
    }

    companion object {
        private const val TAG = "SensorFusionPipeline"
        const val HEADING_RESPONSIVENESS = 0.15
        const val STEP_THRESHOLD_MAGNITUDE = 2.0
        const val STEP_COOLDOWN_NANOS = 300_000_000L // 300ms
        const val DEFAULT_USER_HEIGHT = 1.7
        const val MAGNETIC_MATCH_INTERVAL_MILLIS = 2_000L
        const val MAGNETIC_K_NEAREST = 3
        const val MAGNETIC_MIN_CONFIDENCE = 0.5
        const val WIFI_MATCH_INTERVAL_MILLIS = 5_000L
        const val WIFI_K_NEAREST = 3
        const val WIFI_MIN_CONFIDENCE = 0.4
        const val MIN_WIFI_APS = 3
        const val FUSED_EMIT_INTERVAL_NANOS = 500_000_000L // 500ms
    }
}
