package com.campusar.app.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "cached_locations",
    indices = [
        Index(value = ["campus_id"]),
        Index(value = ["category_key"]),
        Index(value = ["status"]),
    ],
)
data class CachedLocationEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "campus_id") val campusId: String,
    @ColumnInfo(name = "building_id") val buildingId: String?,
    @ColumnInfo(name = "floor_id") val floorId: String?,
    @ColumnInfo(name = "zone_id") val zoneId: String?,
    @ColumnInfo(name = "category_key") val categoryKey: String,
    val label: String,
    val latitude: Double?,
    val longitude: Double?,
    @ColumnInfo(name = "coordinate_status") val coordinateStatus: String,
    val status: String,
    @ColumnInfo(name = "confidence_score") val confidenceScore: Double,
    @ColumnInfo(name = "synced_at_epoch_millis") val syncedAtEpochMillis: Long,
)
