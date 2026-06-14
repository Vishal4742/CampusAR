package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedMagneticFingerprintEntity

@Dao
interface MagneticFingerprintDao {
    @Query("SELECT * FROM cached_magnetic_fingerprints")
    fun loadAll(): List<CachedMagneticFingerprintEntity>

    @Query("SELECT COUNT(*) FROM cached_magnetic_fingerprints")
    fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(entities: List<CachedMagneticFingerprintEntity>)

    @Query("DELETE FROM cached_magnetic_fingerprints")
    fun deleteAll()
}
