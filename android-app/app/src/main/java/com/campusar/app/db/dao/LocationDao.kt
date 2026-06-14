package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedLocationEntity

@Dao
interface LocationDao {
    @Query("SELECT COUNT(*) FROM cached_locations")
    fun count(): Int

    @Query("SELECT * FROM cached_locations WHERE status = 'verified' ORDER BY label ASC")
    fun loadAllVerified(): List<CachedLocationEntity>

    @Query("SELECT * FROM cached_locations WHERE category_key = :categoryKey ORDER BY label ASC")
    fun loadByCategory(categoryKey: String): List<CachedLocationEntity>

    @Query("SELECT * FROM cached_locations WHERE id = :id LIMIT 1")
    fun findById(id: String): CachedLocationEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(locations: List<CachedLocationEntity>)

    @Query("DELETE FROM cached_locations")
    fun deleteAll()
}
