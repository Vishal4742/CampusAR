package com.campusar.app.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "cached_edges",
    indices = [
        Index(value = ["from_location_id"]),
        Index(value = ["to_location_id"]),
    ],
)
data class CachedEdgeEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "campus_id") val campusId: String,
    @ColumnInfo(name = "from_location_id") val fromLocationId: String,
    @ColumnInfo(name = "to_location_id") val toLocationId: String,
    @ColumnInfo(name = "distance_meters") val distanceMeters: Double,
    @ColumnInfo(name = "edge_type") val edgeType: String,
    val bidirectional: Boolean,
    @ColumnInfo(name = "wheelchair_accessible") val wheelchairAccessible: Boolean,
    @ColumnInfo(name = "floor_transition_type") val floorTransitionType: String?,
    @ColumnInfo(name = "walk_count") val walkCount: Int,
    @ColumnInfo(name = "confidence_score") val confidenceScore: Double,
    @ColumnInfo(name = "synced_at_epoch_millis") val syncedAtEpochMillis: Long,
)
