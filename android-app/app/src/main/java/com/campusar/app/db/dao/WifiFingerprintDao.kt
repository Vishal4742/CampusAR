package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedWifiFingerprintEntity

@Dao
interface WifiFingerprintDao {
    @Query("SELECT * FROM cached_wifi_fingerprints")
    fun loadAll(): List<CachedWifiFingerprintEntity>

    @Query("SELECT COUNT(*) FROM cached_wifi_fingerprints")
    fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(entities: List<CachedWifiFingerprintEntity>)

    @Query("DELETE FROM cached_wifi_fingerprints")
    fun deleteAll()
}
