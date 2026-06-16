package com.campusar.app.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.campusar.app.db.dao.EdgeDao
import com.campusar.app.db.dao.FloorProfileDao
import com.campusar.app.db.dao.LocationDao
import com.campusar.app.db.dao.MagneticFingerprintDao
import com.campusar.app.db.dao.QrAnchorDao
import com.campusar.app.db.dao.SessionDao
import com.campusar.app.db.dao.SettingsDao
import com.campusar.app.db.dao.WifiFingerprintDao
import com.campusar.app.db.entity.AppSettingsEntity
import com.campusar.app.db.entity.CachedEdgeEntity
import com.campusar.app.db.entity.CachedFloorProfileEntity
import com.campusar.app.db.entity.CachedLocationEntity
import com.campusar.app.db.entity.CachedMagneticFingerprintEntity
import com.campusar.app.db.entity.CachedQrAnchorEntity
import com.campusar.app.db.entity.CachedWifiFingerprintEntity
import com.campusar.app.db.entity.UserSessionEntity

@Database(
    entities = [
        CachedLocationEntity::class,
        CachedEdgeEntity::class,
        AppSettingsEntity::class,
        CachedWifiFingerprintEntity::class,
        CachedMagneticFingerprintEntity::class,
        CachedFloorProfileEntity::class,
        CachedQrAnchorEntity::class,
        UserSessionEntity::class,
    ],
    version = 3,
    exportSchema = false,
)
abstract class CampusDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao
    abstract fun edgeDao(): EdgeDao
    abstract fun settingsDao(): SettingsDao
    abstract fun wifiFingerprintDao(): WifiFingerprintDao
    abstract fun magneticFingerprintDao(): MagneticFingerprintDao
    abstract fun floorProfileDao(): FloorProfileDao
    abstract fun qrAnchorDao(): QrAnchorDao
    abstract fun sessionDao(): SessionDao

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
                    .allowMainThreadQueries()
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { db -> instance = db }
            }
        }

        private const val DATABASE_NAME = "campus_ar.db"
    }
}
