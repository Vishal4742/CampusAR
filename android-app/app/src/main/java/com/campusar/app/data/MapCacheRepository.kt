package com.campusar.app.data

import android.content.Context
import com.campusar.app.db.CampusDatabase
import com.campusar.app.db.entity.AppSettingsEntity
import com.campusar.app.db.entity.CachedEdgeEntity
import com.campusar.app.db.entity.CachedLocationEntity
import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint

class MapCacheRepository(context: Context) {
    private val db = CampusDatabase.getInstance(context)

    fun locationCount(): Int = db.locationDao().count()

    fun edgeCount(): Int = db.edgeDao().count()

    fun loadCachedDestinations(): List<Destination> =
        db.locationDao().loadAllVerified().mapNotNull { it.toDestination() }

    fun loadCachedEdges(): List<CachedEdgeEntity> = db.edgeDao().loadAll()

    fun upsertLocations(locations: List<CachedLocationEntity>) =
        db.locationDao().upsertAll(locations)

    fun upsertEdges(edges: List<CachedEdgeEntity>) =
        db.edgeDao().upsertAll(edges)

    fun clearLocations() = db.locationDao().deleteAll()

    fun clearEdges() = db.edgeDao().deleteAll()

    fun getSyncCursor(): String? = db.settingsDao().getString(KEY_SYNC_CURSOR)

    fun setSyncCursor(cursor: String) =
        db.settingsDao().set(AppSettingsEntity(KEY_SYNC_CURSOR, cursor, System.currentTimeMillis()))

    fun getMapVersion(): Int? = db.settingsDao().getString(KEY_MAP_VERSION)?.toIntOrNull()

    fun setMapVersion(version: Int) =
        db.settingsDao().set(AppSettingsEntity(KEY_MAP_VERSION, version.toString(), System.currentTimeMillis()))

    fun getCampusId(): String? = db.settingsDao().getString(KEY_CAMPUS_ID)

    fun setCampusId(id: String) =
        db.settingsDao().set(AppSettingsEntity(KEY_CAMPUS_ID, id, System.currentTimeMillis()))

    private fun CachedLocationEntity.toDestination(): Destination? {
        val lat = latitude ?: return null
        val lon = longitude ?: return null
        if (lat == 0.0 && lon == 0.0) return null
        return Destination(
            id = id,
            label = label,
            category = categoryKey,
            point = GeoPoint(latitude = lat, longitude = lon),
            floor = 0,
            temporary = coordinateStatus != "verified",
        )
    }

    companion object {
        const val KEY_SYNC_CURSOR = "sync_cursor"
        const val KEY_MAP_VERSION = "map_version"
        const val KEY_CAMPUS_ID = "campus_id"
    }
}
