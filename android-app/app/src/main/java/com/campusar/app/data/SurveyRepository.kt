package com.campusar.app.data

import android.content.Context
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.SurveyExport
import com.campusar.app.model.SurveyPoint
import com.campusar.app.model.SurveyRoute
import com.campusar.app.model.SurveyRouteSample
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import org.json.JSONArray
import org.json.JSONObject

class SurveyRepository(context: Context) {
    private val surveyFile = File(context.filesDir, SURVEY_FILE_NAME)

    fun loadExport(): SurveyExport {
        if (!surveyFile.exists()) {
            return emptyExport()
        }

        return runCatching {
            parseExport(surveyFile.readText())
        }.getOrElse {
            emptyExport()
        }
    }

    fun addPoint(
        label: String,
        categoryKey: String,
        position: GeoPoint,
        notes: String,
    ): SurveyExport {
        val current = loadExport()
        val point = SurveyPoint(
            localId = nextId("P", current.points.size + 1),
            label = label.ifBlank { "Survey Point ${current.points.size + 1}" },
            categoryKey = categoryKey,
            position = position,
            notes = notes,
            capturedAtEpochMillis = System.currentTimeMillis(),
        )
        return save(
            current.copy(
                exportedAtEpochMillis = System.currentTimeMillis(),
                points = current.points + point,
            ),
        )
    }

    fun addRoute(
        label: String,
        fromLocalPointId: String?,
        toLocalPointId: String?,
        samples: List<SurveyRouteSample>,
        notes: String,
    ): SurveyExport {
        val current = loadExport()
        val route = SurveyRoute(
            localId = nextId("R", current.routes.size + 1),
            label = label.ifBlank { "Survey Route ${current.routes.size + 1}" },
            edgeType = DEFAULT_EDGE_TYPE,
            fromLocalPointId = fromLocalPointId,
            toLocalPointId = toLocalPointId,
            geometry = samples,
            notes = notes,
            capturedAtEpochMillis = System.currentTimeMillis(),
        )
        return save(
            current.copy(
                exportedAtEpochMillis = System.currentTimeMillis(),
                routes = current.routes + route,
            ),
        )
    }

    fun clear(): SurveyExport {
        return save(emptyExport())
    }

    fun exportJsonString(): String {
        return exportToJson(loadExport()).toString(2)
    }

    fun exportFileName(): String {
        val timestamp = DateTimeFormatter
            .ofPattern("yyyyMMdd_HHmmss")
            .withZone(ZoneId.systemDefault())
            .format(Instant.now())
        return "campusar_survey_$timestamp.json"
    }

    private fun save(export: SurveyExport): SurveyExport {
        surveyFile.writeText(exportToJson(export).toString(2))
        return export
    }

    private fun emptyExport(): SurveyExport {
        return SurveyExport(
            schemaVersion = SCHEMA_VERSION,
            campusStableKey = CAMPUS_STABLE_KEY,
            collectedBy = COLLECTED_BY,
            deviceTimeZone = ZoneId.systemDefault().id,
            exportedAtEpochMillis = System.currentTimeMillis(),
            points = emptyList(),
            routes = emptyList(),
        )
    }

    private fun parseExport(rawJson: String): SurveyExport {
        val root = JSONObject(rawJson)
        val points = root.optJSONArray("points").toSurveyPoints()
        val routes = root.optJSONArray("routes").toSurveyRoutes()
        return SurveyExport(
            schemaVersion = root.optInt("schemaVersion", SCHEMA_VERSION),
            campusStableKey = root.optString("campusStableKey", CAMPUS_STABLE_KEY),
            collectedBy = root.optString("collectedBy", COLLECTED_BY),
            deviceTimeZone = root.optString("deviceTimeZone", ZoneId.systemDefault().id),
            exportedAtEpochMillis = parseInstantMillis(
                root.optString("exportedAt", ""),
                root.optLong("exportedAtEpochMillis", System.currentTimeMillis()),
            ),
            points = points,
            routes = routes,
        )
    }

    private fun JSONArray?.toSurveyPoints(): List<SurveyPoint> {
        if (this == null) {
            return emptyList()
        }

        return List(length()) { index ->
            val item = getJSONObject(index)
            SurveyPoint(
                localId = item.optString("localId"),
                label = item.optString("label"),
                categoryKey = item.optString("categoryKey", "other"),
                position = item.getJSONObject("position").toGeoPoint(),
                notes = item.optString("notes"),
                capturedAtEpochMillis = parseInstantMillis(
                    item.optString("capturedAt", ""),
                    item.optLong("capturedAtEpochMillis", System.currentTimeMillis()),
                ),
            )
        }
    }

    private fun JSONArray?.toSurveyRoutes(): List<SurveyRoute> {
        if (this == null) {
            return emptyList()
        }

        return List(length()) { index ->
            val item = getJSONObject(index)
            SurveyRoute(
                localId = item.optString("localId"),
                label = item.optString("label"),
                edgeType = item.optString("edgeType", DEFAULT_EDGE_TYPE),
                fromLocalPointId = item.optNullableString("fromLocalPointId"),
                toLocalPointId = item.optNullableString("toLocalPointId"),
                geometry = item.optJSONArray("geometry").toRouteSamples(),
                notes = item.optString("notes"),
                capturedAtEpochMillis = parseInstantMillis(
                    item.optString("capturedAt", ""),
                    item.optLong("capturedAtEpochMillis", System.currentTimeMillis()),
                ),
            )
        }
    }

    private fun JSONArray?.toRouteSamples(): List<SurveyRouteSample> {
        if (this == null) {
            return emptyList()
        }

        return List(length()) { index ->
            val item = getJSONObject(index)
            val capturedAt = parseInstantMillis(
                item.optString("capturedAt", ""),
                item.optLong("capturedAtEpochMillis", System.currentTimeMillis()),
            )
            SurveyRouteSample(
                position = item.toGeoPoint(capturedAt),
                capturedAtEpochMillis = capturedAt,
            )
        }
    }

    private fun JSONObject.toGeoPoint(
        fallbackCapturedAtEpochMillis: Long = System.currentTimeMillis(),
    ): GeoPoint {
        return GeoPoint(
            latitude = getDouble("latitude"),
            longitude = getDouble("longitude"),
            accuracyMeters = if (has("accuracyMeters") && !isNull("accuracyMeters")) {
                getDouble("accuracyMeters").toFloat()
            } else {
                null
            },
            capturedAtEpochMillis = parseInstantMillis(
                optString("capturedAt", ""),
                optLong("capturedAtEpochMillis", fallbackCapturedAtEpochMillis),
            ),
        )
    }

    private fun exportToJson(export: SurveyExport): JSONObject {
        return JSONObject()
            .put("schemaVersion", export.schemaVersion)
            .put("campusStableKey", export.campusStableKey)
            .put("collectedBy", export.collectedBy)
            .put("deviceTimeZone", export.deviceTimeZone)
            .put("exportedAt", isoInstant(export.exportedAtEpochMillis))
            .put("points", JSONArray(export.points.map { point -> point.toJson() }))
            .put("routes", JSONArray(export.routes.map { route -> route.toJson() }))
    }

    private fun SurveyPoint.toJson(): JSONObject {
        return JSONObject()
            .put("localId", localId)
            .put("label", label)
            .put("categoryKey", categoryKey)
            .put("position", position.toJson())
            .put("coordinateStatus", COORDINATE_STATUS)
            .put("notes", notes)
            .put("capturedAt", isoInstant(capturedAtEpochMillis))
    }

    private fun SurveyRoute.toJson(): JSONObject {
        return JSONObject()
            .put("localId", localId)
            .put("label", label)
            .put("edgeType", edgeType)
            .putNullable("fromLocalPointId", fromLocalPointId)
            .putNullable("toLocalPointId", toLocalPointId)
            .put("geometry", JSONArray(geometry.map { sample -> sample.toJson() }))
            .put("coordinateStatus", COORDINATE_STATUS)
            .put("notes", notes)
            .put("capturedAt", isoInstant(capturedAtEpochMillis))
    }

    private fun SurveyRouteSample.toJson(): JSONObject {
        return position.toJson()
            .put("capturedAt", isoInstant(capturedAtEpochMillis))
    }

    private fun GeoPoint.toJson(): JSONObject {
        return JSONObject()
            .put("latitude", latitude)
            .put("longitude", longitude)
            .putNullable("accuracyMeters", accuracyMeters)
    }

    private fun JSONObject.putNullable(name: String, value: Any?): JSONObject {
        return put(name, value ?: JSONObject.NULL)
    }

    private fun JSONObject.optNullableString(name: String): String? {
        if (!has(name) || isNull(name)) {
            return null
        }
        return optString(name).ifBlank { null }
    }

    private fun nextId(prefix: String, number: Int): String {
        return "$prefix${number.toString().padStart(3, '0')}"
    }

    private fun isoInstant(epochMillis: Long): String {
        return Instant.ofEpochMilli(epochMillis).toString()
    }

    private fun parseInstantMillis(value: String, fallback: Long): Long {
        if (value.isBlank()) {
            return fallback
        }
        return runCatching {
            Instant.parse(value).toEpochMilli()
        }.getOrDefault(fallback)
    }

    private companion object {
        const val SURVEY_FILE_NAME = "campusar_survey.json"
        const val SCHEMA_VERSION = 1
        const val CAMPUS_STABLE_KEY = "oct-bhopal"
        const val COLLECTED_BY = "manual-field-survey"
        const val COORDINATE_STATUS = "field_collected"
        const val DEFAULT_EDGE_TYPE = "outdoor_walkway"
    }
}
