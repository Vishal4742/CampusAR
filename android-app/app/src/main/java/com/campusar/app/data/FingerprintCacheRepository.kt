package com.campusar.app.data

import android.content.Context
import android.util.Log
import com.campusar.app.db.CampusDatabase
import com.campusar.app.db.entity.CachedFloorProfileEntity
import com.campusar.app.db.entity.CachedMagneticFingerprintEntity
import com.campusar.app.db.entity.CachedQrAnchorEntity
import com.campusar.app.db.entity.CachedWifiFingerprintEntity
import com.campusar.app.location.WifiScanSource
import com.campusar.app.nativebridge.NativeNavigationEngine
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

data class QrAnchor(
    val id: String,
    val codeKey: String,
    val label: String,
    val latitude: Double,
    val longitude: Double,
    val floorIndex: Int,
)

class FingerprintCacheRepository(
    private val context: Context,
    private val native: NativeNavigationEngine,
) {
    private val db = CampusDatabase.getInstance(context)

    fun findQrAnchor(codeKey: String): QrAnchor? {
        val cached = runCatching { db.qrAnchorDao().findByCodeKey(codeKey) }.getOrNull()
        if (cached != null) {
            return QrAnchor(
                id = cached.id,
                codeKey = cached.codeKey,
                label = cached.label,
                latitude = cached.latitude,
                longitude = cached.longitude,
                floorIndex = cached.floorIndex,
            )
        }
        return null
    }

    fun getCachedQrAnchors(): List<QrAnchor> {
        return runCatching {
            db.qrAnchorDao().loadAllActive().map {
                QrAnchor(it.id, it.codeKey, it.label, it.latitude, it.longitude, it.floorIndex)
            }
        }.getOrDefault(emptyList())
    }

    /**
     * Fetch from backend and persist to Room + native engine.
     * Should be called from a background thread.
     */
    fun refreshFromBackend(baseUrl: String): RefreshResult {
        var wifiCount = 0
        var magneticCount = 0
        var floorCount = 0
        var qrCount = 0
        var errors = mutableListOf<String>()

        // Clear native fingerprint databases
        native.wifiDbClear()
        native.magneticDbClear()
        native.floorDetectorClear()

        // Clear Room caches
        runCatching { db.wifiFingerprintDao().deleteAll() }
        runCatching { db.magneticFingerprintDao().deleteAll() }
        runCatching { db.floorProfileDao().deleteAll() }
        runCatching { db.qrAnchorDao().deleteAll() }

        // 1. WiFi fingerprints
        try {
            val body = get("$baseUrl/api/v1/map/fingerprints/wifi")
            if (body != null) {
                val json = JSONObject(body)
                val arr = json.optJSONArray("fingerprints") ?: json.optJSONArray("wifiFingerprints")
                if (arr != null) {
                    val entities = mutableListOf<CachedWifiFingerprintEntity>()
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val id = item.getInt("id")
                        val lat = item.getDouble("latitude")
                        val lon = item.getDouble("longitude")
                        val floor = item.optInt("floor", 0)
                        val readings = item.optJSONArray("readings")

                        entities.add(
                            CachedWifiFingerprintEntity(
                                fingerprintId = id,
                                latitude = lat,
                                longitude = lon,
                                floorIndex = floor,
                                readingsJson = readings?.toString() ?: "[]",
                                syncedAtEpochMillis = System.currentTimeMillis(),
                            ),
                        )

                        // Load into native via JNI
                        if (readings != null) {
                            val count = readings.length()
                            val hashBuffer = java.nio.ByteBuffer.allocateDirect(count * 8)
                                .order(java.nio.ByteOrder.nativeOrder())
                            val rssiBuffer = java.nio.ByteBuffer.allocateDirect(count * 4)
                                .order(java.nio.ByteOrder.nativeOrder())

                            for (j in 0 until count) {
                                val reading = readings.getJSONObject(j)
                                val bssidHash = reading.getLong("bssidHash")
                                val rssi = reading.getInt("rssi")
                                hashBuffer.putLong(bssidHash)
                                rssiBuffer.putInt(rssi)
                            }
                            hashBuffer.flip()
                            rssiBuffer.flip()

                            try {
                                val hField = java.nio.Buffer::class.java.getDeclaredField("address")
                                hField.isAccessible = true
                                val hashPtr = hField.getLong(hashBuffer)
                                val rssiPtr = hField.getLong(rssiBuffer)
                                native.wifiDbAddFingerprint(id, lat, lon, floor, hashPtr, rssiPtr, count)
                            } catch (e: Exception) {
                                Log.w(TAG, "Direct buffer address failed for WiFi: ${e.message}")
                            }
                        }
                        wifiCount++
                    }
                    runCatching { db.wifiFingerprintDao().insertAll(entities) }
                }
            }
        } catch (e: Exception) {
            errors.add("WiFi: ${e.message}")
        }

        // 2. Magnetic fingerprints
        try {
            val body = get("$baseUrl/api/v1/map/fingerprints/magnetic")
            if (body != null) {
                val json = JSONObject(body)
                val arr = json.optJSONArray("fingerprints") ?: json.optJSONArray("magneticFingerprints")
                if (arr != null) {
                    val entities = mutableListOf<CachedMagneticFingerprintEntity>()
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val id = item.getInt("id")
                        val lat = item.getDouble("latitude")
                        val lon = item.getDouble("longitude")
                        val floor = item.optInt("floor", 0)
                        val fx = item.getDouble("fx")
                        val fy = item.getDouble("fy")
                        val fz = item.getDouble("fz")

                        entities.add(
                            CachedMagneticFingerprintEntity(
                                fingerprintId = id,
                                latitude = lat,
                                longitude = lon,
                                floorIndex = floor,
                                fx = fx,
                                fy = fy,
                                fz = fz,
                                magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz),
                                syncedAtEpochMillis = System.currentTimeMillis(),
                            ),
                        )

                        native.magneticDbAddFingerprint(id, lat, lon, floor, fx, fy, fz)
                        magneticCount++
                    }
                    runCatching { db.magneticFingerprintDao().insertAll(entities) }
                }
            }
        } catch (e: Exception) {
            errors.add("Magnetic: ${e.message}")
        }

        // 3. Floor profiles
        try {
            val body = get("$baseUrl/api/v1/map/floor-profiles")
            if (body != null) {
                val json = JSONObject(body)
                val arr = json.optJSONArray("profiles") ?: json.optJSONArray("floorProfiles")
                if (arr != null) {
                    val entities = mutableListOf<CachedFloorProfileEntity>()
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val floorIndex = item.getInt("floorIndex")
                        val refPressure = item.getDouble("refPressureHpa")
                        val relAlt = item.getDouble("relAltMeters")

                        entities.add(
                            CachedFloorProfileEntity(
                                floorIndex = floorIndex,
                                buildingId = item.optString("buildingId", "oct-bhopal"),
                                refPressureHpa = refPressure,
                                relAltMeters = relAlt,
                                syncedAtEpochMillis = System.currentTimeMillis(),
                            ),
                        )

                        native.floorDetectorAddProfile(floorIndex, refPressure, relAlt)
                        floorCount++
                    }
                    runCatching { db.floorProfileDao().insertAll(entities) }
                }
            }
        } catch (e: Exception) {
            errors.add("Floor: ${e.message}")
        }

        // 4. QR anchors
        try {
            val body = get("$baseUrl/api/v1/map/qr-anchors")
            if (body != null) {
                val json = JSONObject(body)
                val arr = json.optJSONArray("anchors") ?: json.optJSONArray("qrAnchors")
                if (arr != null) {
                    val entities = mutableListOf<CachedQrAnchorEntity>()
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        entities.add(
                            CachedQrAnchorEntity(
                                id = item.getString("id"),
                                codeKey = item.getString("codeKey"),
                                label = item.optString("label", "QR Anchor"),
                                latitude = item.getDouble("latitude"),
                                longitude = item.getDouble("longitude"),
                                floorIndex = item.getInt("floorIndex"),
                                active = item.optBoolean("active", true),
                                syncedAtEpochMillis = System.currentTimeMillis(),
                            ),
                        )
                        qrCount++
                    }
                    runCatching { db.qrAnchorDao().insertAll(entities) }
                }
            }
        } catch (e: Exception) {
            errors.add("QR: ${e.message}")
        }

        return RefreshResult(
            wifiFingerprints = wifiCount,
            magneticFingerprints = magneticCount,
            floorProfiles = floorCount,
            qrAnchors = qrCount,
            errors = errors,
        )
    }

    /**
     * Load cached fingerprint data into native engine without network.
     */
    fun loadCachedIntoNative() {
        native.wifiDbClear()
        native.magneticDbClear()
        native.floorDetectorClear()

        // WiFi from Room
        val wifiEntities = runCatching { db.wifiFingerprintDao().loadAll() }.getOrDefault(emptyList())
        for (entity in wifiEntities) {
            try {
                val readings = JSONArray(entity.readingsJson)
                val count = readings.length()
                val hashBuffer = java.nio.ByteBuffer.allocateDirect(count * 8)
                    .order(java.nio.ByteOrder.nativeOrder())
                val rssiBuffer = java.nio.ByteBuffer.allocateDirect(count * 4)
                    .order(java.nio.ByteOrder.nativeOrder())
                for (j in 0 until count) {
                    val r = readings.getJSONObject(j)
                    hashBuffer.putLong(r.getLong("bssidHash"))
                    rssiBuffer.putInt(r.getInt("rssi"))
                }
                hashBuffer.flip()
                rssiBuffer.flip()
                val hField = java.nio.Buffer::class.java.getDeclaredField("address")
                hField.isAccessible = true
                val hashPtr = hField.getLong(hashBuffer)
                val rssiPtr = hField.getLong(rssiBuffer)
                native.wifiDbAddFingerprint(entity.fingerprintId, entity.latitude, entity.longitude, entity.floorIndex, hashPtr, rssiPtr, count)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load cached WiFi ${entity.fingerprintId}: ${e.message}")
            }
        }

        // Magnetic from Room
        val magEntities = runCatching { db.magneticFingerprintDao().loadAll() }.getOrDefault(emptyList())
        for (entity in magEntities) {
            native.magneticDbAddFingerprint(entity.fingerprintId, entity.latitude, entity.longitude, entity.floorIndex, entity.fx, entity.fy, entity.fz)
        }

        // Floor profiles from Room
        val floorEntities = runCatching { db.floorProfileDao().loadAll() }.getOrDefault(emptyList())
        for (entity in floorEntities) {
            native.floorDetectorAddProfile(entity.floorIndex, entity.refPressureHpa, entity.relAltMeters)
        }
    }

    fun getCachedWifiFingerprintCount(): Int = runCatching { db.wifiFingerprintDao().count() }.getOrDefault(0)
    fun getCachedMagneticFingerprintCount(): Int = runCatching { db.magneticFingerprintDao().count() }.getOrDefault(0)
    fun getCachedFloorProfileCount(): Int = runCatching { db.floorProfileDao().count() }.getOrDefault(0)
    fun getCachedQrAnchorCount(): Int = runCatching { db.qrAnchorDao().count() }.getOrDefault(0)

    private fun get(path: String): String? {
        return try {
            val url = URL(path)
            val connection = url.openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = TIMEOUT_MILLIS
                connection.readTimeout = TIMEOUT_MILLIS
                connection.requestMethod = "GET"
                connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            Log.w(TAG, "GET $path failed: ${e.message}")
            null
        }
    }

    data class RefreshResult(
        val wifiFingerprints: Int,
        val magneticFingerprints: Int,
        val floorProfiles: Int,
        val qrAnchors: Int,
        val errors: List<String>,
    )

    companion object {
        private const val TAG = "FingerprintCacheRepo"
        private const val TIMEOUT_MILLIS = 10_000
    }
}
