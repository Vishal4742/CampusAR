package com.campusar.app.data

import android.content.Context
import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint
import org.json.JSONObject

class DestinationRepository(private val context: Context) {
    private val mapCache = MapCacheRepository(context)

    fun loadDestinations(): List<Destination> {
        val cached = runCatching { mapCache.loadCachedDestinations() }.getOrElse { emptyList() }
        if (cached.isNotEmpty()) return cached
        return loadSeedDestinations()
    }

    fun loadSeedDestinations(): List<Destination> {
        return runCatching {
            val rawJson = context.assets.open(SEED_FILE).bufferedReader().use { it.readText() }
            parseDestinations(rawJson)
        }.getOrElse { fallbackDestinations() }
    }

    private fun parseDestinations(rawJson: String): List<Destination> {
        val root = JSONObject(rawJson)
        val destinations = root.getJSONArray("destinations")
        return List(destinations.length()) { index ->
            val item = destinations.getJSONObject(index)
            Destination(
                id = item.getString("id"),
                label = item.getString("label"),
                category = item.getString("category"),
                point = GeoPoint(
                    latitude = item.getDouble("latitude"),
                    longitude = item.getDouble("longitude"),
                ),
                floor = item.optInt("floor", 0),
                temporary = item.optBoolean("temporary", true),
            )
        }
    }

    private fun fallbackDestinations() = listOf(
        Destination(
            id = "fallback_placeholder",
            label = "Temporary Destination Placeholder",
            category = "placeholder",
            point = GeoPoint(latitude = 0.0, longitude = 0.0),
            floor = 0,
            temporary = true,
        ),
    )

    private companion object {
        const val SEED_FILE = "seed_destinations.json"
    }
}
