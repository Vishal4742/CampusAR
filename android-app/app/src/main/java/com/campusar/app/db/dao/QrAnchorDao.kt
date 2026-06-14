package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.CachedQrAnchorEntity

@Dao
interface QrAnchorDao {
    @Query("SELECT * FROM cached_qr_anchors WHERE active = 1")
    fun loadAllActive(): List<CachedQrAnchorEntity>

    @Query("SELECT * FROM cached_qr_anchors WHERE codeKey = :codeKey AND active = 1 LIMIT 1")
    fun findByCodeKey(codeKey: String): CachedQrAnchorEntity?

    @Query("SELECT COUNT(*) FROM cached_qr_anchors")
    fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(entities: List<CachedQrAnchorEntity>)

    @Query("DELETE FROM cached_qr_anchors")
    fun deleteAll()
}
