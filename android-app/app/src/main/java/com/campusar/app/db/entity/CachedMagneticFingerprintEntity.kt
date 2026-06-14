package com.campusar.app.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_magnetic_fingerprints")
data class CachedMagneticFingerprintEntity(
    @PrimaryKey
    val fingerprintId: Int,
    val latitude: Double,
    val longitude: Double,
    val floorIndex: Int,
    val fx: Double,
    val fy: Double,
    val fz: Double,
    val magnitude: Double,
    val syncedAtEpochMillis: Long,
)
