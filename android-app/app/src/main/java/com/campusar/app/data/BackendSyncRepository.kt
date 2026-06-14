package com.campusar.app.data

import android.content.Context
import com.campusar.app.db.entity.CachedEdgeEntity
import com.campusar.app.db.entity.CachedLocationEntity
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

data class SyncManifest(
    val mapVersion: Int,
    val latestChangeId: Int,
    val mappingLocked: Boolean,
)

data class SyncResult(
    val locationCount: Int,
    val edgeCount: Int,
    val mapVersion: Int,
    val success: Boolean,
)

class BackendSyncRepository(
    context: Context,
    private val baseUrl: String,
) {
    private val mapCache = MapCacheRepository(context)

    private fun get(path: String): String? {
        return try {
            val connection = URL("$baseUrl$path").openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = TIMEOUT_MILLIS
                connection.readTimeout = TIMEOUT_MILLIS
                connection.requestMethod = "GET"
                connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
                    reader.readText()
                }
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            null
        }
    }

    fun syncManifest(): SyncManifest? {
        return try {
            val body = get("/api/v1/sync/manifest") ?: return null
            val json = JSONObject(body)
            SyncManifest(
                mapVersion = json.getInt("mapVersion"),
                latestChangeId = json.getInt("latestChangeId"),
                mappingLocked = json.getBoolean("mappingLocked"),
            )
        } catch (_: Exception) {
            null
        }
    }

    fun syncLocations(): Int {
        return try {
            val body = get("/api/v1/map/locations") ?: return 0
            val locations = JSONObject(body).getJSONArray("locations").toLocationEntities()
            mapCache.upsertLocations(locations)
            locations.size
        } catch (_: Exception) {
            0
        }
    }

    fun syncEdges(): Int {
        return try {
            val body = get("/api/v1/map/edges") ?: return 0
            val edges = JSONObject(body).getJSONArray("edges").toEdgeEntities()
            mapCache.upsertEdges(edges)
            edges.size
        } catch (_: Exception) {
            0
        }
    }

    fun fullSync(): SyncResult {
        val manifest = syncManifest()
        val locationCount = syncLocations()
        val edgeCount = syncEdges()
        return SyncResult(
            locationCount = locationCount,
            edgeCount = edgeCount,
            mapVersion = manifest?.mapVersion ?: 0,
            success = manifest != null,
        )
    }

    private fun JSONArray.toLocationEntities(): List<CachedLocationEntity> {
        val syncedAt = System.currentTimeMillis()
        return List(length()) { index ->
            getJSONObject(index).toLocationEntity(syncedAt)
        }
    }

    private fun JSONObject.toLocationEntity(syncedAt: Long): CachedLocationEntity {
        val coordinates = getJSONObject("point").getJSONArray("coordinates")
        return CachedLocationEntity(
            id = getString("id"),
            campusId = getString("campusId"),
            buildingId = nullableString("buildingId"),
            floorId = nullableString("floorId"),
            zoneId = nullableString("zoneId"),
            categoryKey = getString("categoryKey"),
            label = getString("label"),
            latitude = coordinates.getDouble(1),
            longitude = coordinates.getDouble(0),
            coordinateStatus = getString("coordinateStatus"),
            status = getString("status"),
            confidenceScore = getDouble("confidenceScore"),
            syncedAtEpochMillis = syncedAt,
        )
    }

    private fun JSONArray.toEdgeEntities(): List<CachedEdgeEntity> {
        val syncedAt = System.currentTimeMillis()
        return List(length()) { index ->
            getJSONObject(index).toEdgeEntity(syncedAt)
        }
    }

    private fun JSONObject.toEdgeEntity(syncedAt: Long): CachedEdgeEntity {
        return CachedEdgeEntity(
            id = getString("id"),
            campusId = getString("campusId"),
            fromLocationId = getString("fromLocationId"),
            toLocationId = getString("toLocationId"),
            distanceMeters = getDouble("distanceMeters"),
            edgeType = getString("edgeType"),
            bidirectional = getBoolean("bidirectional"),
            wheelchairAccessible = getBoolean("wheelchairAccessible"),
            floorTransitionType = nullableString("floorTransitionType"),
            walkCount = getInt("walkCount"),
            confidenceScore = getDouble("confidenceScore"),
            syncedAtEpochMillis = syncedAt,
        )
    }

    private fun JSONObject.nullableString(name: String): String? {
        if (!has(name) || isNull(name)) {
            return null
        }
        return optString(name).ifBlank { null }
    }

    private companion object {
        const val TIMEOUT_MILLIS = 10_000
    }
}
