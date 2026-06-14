package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedFloorProfileEntity

@Dao
interface FloorProfileDao {
    @Query("SELECT * FROM cached_floor_profiles")
    fun loadAll(): List<CachedFloorProfileEntity>

    @Query("SELECT COUNT(*) FROM cached_floor_profiles")
    fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(entities: List<CachedFloorProfileEntity>)

    @Query("DELETE FROM cached_floor_profiles")
    fun deleteAll()
}
