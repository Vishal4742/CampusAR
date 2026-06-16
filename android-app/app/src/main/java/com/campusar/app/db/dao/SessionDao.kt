package com.campusar.app.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campusar.app.db.entity.UserSessionEntity

@Dao
interface SessionDao {
    @Query("SELECT * FROM user_sessions ORDER BY expires_at DESC LIMIT 1")
    fun getSession(): UserSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertSession(session: UserSessionEntity)

    @Query("DELETE FROM user_sessions")
    fun deleteAll()
}
