package com.campusar.app.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_wifi_fingerprints")
data class CachedWifiFingerprintEntity(
    @PrimaryKey
    val fingerprintId: Int,
    val latitude: Double,
    val longitude: Double,
    val floorIndex: Int,
    @ColumnInfo(name = "readings_json")
    val readingsJson: String,
    val syncedAtEpochMillis: Long,
)
