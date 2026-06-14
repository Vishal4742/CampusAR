package com.campusar.app.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_qr_anchors")
data class CachedQrAnchorEntity(
    @PrimaryKey
    val id: String,
    val codeKey: String,
    val label: String,
    val latitude: Double,
    val longitude: Double,
    val floorIndex: Int,
    val active: Boolean,
    val syncedAtEpochMillis: Long,
)
