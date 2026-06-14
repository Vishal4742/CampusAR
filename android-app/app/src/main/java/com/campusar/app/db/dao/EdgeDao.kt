package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedEdgeEntity

@Dao
interface EdgeDao {
    @Query("SELECT COUNT(*) FROM cached_edges")
    fun count(): Int

    @Query("SELECT * FROM cached_edges")
    fun loadAll(): List<CachedEdgeEntity>

    @Query("SELECT * FROM cached_edges WHERE from_location_id = :locationId OR (bidirectional = 1 AND to_location_id = :locationId)")
    fun loadEdgesForLocation(locationId: String): List<CachedEdgeEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(edges: List<CachedEdgeEntity>)

    @Query("DELETE FROM cached_edges")
    fun deleteAll()
}
