package com.campusar.app.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_settings")
data class AppSettingsEntity(
    @PrimaryKey val key: String,
    val value: String,
    @ColumnInfo(name = "updated_at_epoch_millis") val updatedAtEpochMillis: Long,
)
