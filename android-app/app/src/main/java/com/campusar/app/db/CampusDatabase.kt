package com.campusar.app.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.campusar.app.db.dao.EdgeDao
import com.campusar.app.db.dao.LocationDao
import com.campusar.app.db.dao.SettingsDao
import com.campusar.app.db.entity.AppSettingsEntity
import com.campusar.app.db.entity.CachedEdgeEntity
import com.campusar.app.db.entity.CachedLocationEntity

@Database(
    entities = [
        CachedLocationEntity::class,
        CachedEdgeEntity::class,
        AppSettingsEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class CampusDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao
    abstract fun edgeDao(): EdgeDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var instance: CampusDatabase? = null

        fun getInstance(context: Context): CampusDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    CampusDatabase::class.java,
                    DATABASE_NAME,
                )
                    // Phase 1: allow main-thread queries to match existing synchronous
                    // data loading pattern. Replace with coroutines in Phase 2.
                    .allowMainThreadQueries()
                    .build()
                    .also { db -> instance = db }
            }
        }

        private const val DATABASE_NAME = "campus_ar.db"
    }
}
