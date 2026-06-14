package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.AppSettingsEntity

@Dao
interface SettingsDao {
    @Query("SELECT value FROM app_settings WHERE key = :key LIMIT 1")
    fun getString(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun set(setting: AppSettingsEntity)

    @Query("DELETE FROM app_settings WHERE key = :key")
    fun delete(key: String)
}
