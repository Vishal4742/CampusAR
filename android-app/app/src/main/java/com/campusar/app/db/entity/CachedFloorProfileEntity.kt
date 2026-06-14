package com.campusar.app.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_floor_profiles")
data class CachedFloorProfileEntity(
    @PrimaryKey
    val floorIndex: Int,
    val buildingId: String,
    val refPressureHpa: Double,
    val relAltMeters: Double,
    val syncedAtEpochMillis: Long,
)
