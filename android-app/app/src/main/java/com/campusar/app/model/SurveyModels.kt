package com.campusar.app.model

data class SurveyPoint(
    val localId: String,
    val label: String,
    val categoryKey: String,
    val position: GeoPoint,
    val notes: String,
    val capturedAtEpochMillis: Long,
)

data class SurveyRouteSample(
    val position: GeoPoint,
    val capturedAtEpochMillis: Long,
)

data class SurveyRoute(
    val localId: String,
    val label: String,
    val edgeType: String,
    val fromLocalPointId: String?,
    val toLocalPointId: String?,
    val geometry: List<SurveyRouteSample>,
    val notes: String,
    val capturedAtEpochMillis: Long,
)

data class SurveyExport(
    val schemaVersion: Int,
    val campusStableKey: String,
    val collectedBy: String,
    val deviceTimeZone: String,
    val exportedAtEpochMillis: Long,
    val points: List<SurveyPoint>,
    val routes: List<SurveyRoute>,
)
