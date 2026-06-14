package com.campusar.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import com.campusar.app.data.DestinationRepository
import com.campusar.app.data.SurveyRepository
import com.campusar.app.location.DeviceSensorSource
import com.campusar.app.location.GpsLocationSource
import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.NavigationOverlayState
import com.campusar.app.model.SensorAvailability
import com.campusar.app.model.SensorSnapshot
import com.campusar.app.model.SurveyExport
import com.campusar.app.model.SurveyRouteSample
import com.campusar.app.nativebridge.NativeNavigationEngine
import com.campusar.app.ui.CompassOverlaySurfaceView

class MainActivity : Activity() {
    private lateinit var locationSource: GpsLocationSource
    private lateinit var sensorSource: DeviceSensorSource
    private lateinit var nativeEngine: NativeNavigationEngine
    private lateinit var surveyRepository: SurveyRepository
    private lateinit var compassOverlay: CompassOverlaySurfaceView
    private lateinit var statusText: TextView
    private lateinit var locationText: TextView
    private lateinit var nativeText: TextView
    private lateinit var sensorText: TextView
    private lateinit var surveySummaryText: TextView
    private lateinit var routeStatusText: TextView
    private lateinit var destinationSpinner: Spinner
    private lateinit var pointCategorySpinner: Spinner
    private lateinit var pointLabelInput: EditText
    private lateinit var pointNotesInput: EditText
    private lateinit var routeLabelInput: EditText
    private lateinit var routeNotesInput: EditText
    private lateinit var startRouteButton: Button
    private lateinit var stopRouteButton: Button

    private var currentPoint: GeoPoint? = null
    private var currentHeadingDegrees: Double = 0.0
    private var selectedDestination: Destination? = null
    private var destinations: List<Destination> = emptyList()
    private var sensorAvailability: SensorAvailability? = null
    private var latestSensorSnapshot: SensorSnapshot = SensorSnapshot()
    private var surveyExport: SurveyExport? = null
    private var isRecordingRoute: Boolean = false
    private var routeSamples: MutableList<SurveyRouteSample> = mutableListOf()
    private var lastRouteSample: GeoPoint? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nativeEngine = NativeNavigationEngine()
        locationSource = GpsLocationSource(this)
        sensorSource = DeviceSensorSource(this)
        sensorAvailability = sensorSource.availability()
        surveyRepository = SurveyRepository(this)
        surveyExport = surveyRepository.loadExport()
        destinations = DestinationRepository(this).loadDestinations()
        selectedDestination = destinations.firstOrNull()

        setContentView(buildContentView())
        bindDestinationSpinner()
        bindPointCategorySpinner()
        updateNativeStatus()
        updateSensorStatus()
        updateNavigationState()
        updateSurveySummary()
    }

    override fun onStart() {
        super.onStart()
        if (locationSource.hasLocationPermission()) {
            startLocationUpdates()
        }
        startSensorUpdates()
    }

    override fun onStop() {
        locationSource.stop()
        sensorSource.stop()
        super.onStop()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == EXPORT_SURVEY_REQUEST && resultCode == RESULT_OK) {
            data?.data?.let { uri ->
                writeSurveyExport(uri)
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            val granted = grantResults.any { result -> result == PackageManager.PERMISSION_GRANTED }
            if (granted) {
                startLocationUpdates()
            } else {
                statusText.text = "Location permission denied. Destination browsing remains available."
            }
        }
    }

    private fun buildContentView(): View {
        compassOverlay = CompassOverlaySurfaceView(this)

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(8, 10, 12))
        }

        root.addView(
            compassOverlay,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 28, 28, 28)
            setBackgroundColor(Color.argb(215, 15, 22, 26))
        }

        val scrollView = ScrollView(this).apply {
            addView(panel)
        }

        val title = TextView(this).apply {
            text = "CampusAR Field Survey"
            textSize = 22f
            setTextColor(Color.WHITE)
        }

        nativeText = statusLabel()
        sensorText = statusLabel()
        locationText = statusLabel("Current location: waiting")
        statusText = statusLabel("Select a destination and grant location permission.")
        surveySummaryText = statusLabel()
        routeStatusText = statusLabel("Route recorder: idle")

        destinationSpinner = Spinner(this)
        pointCategorySpinner = Spinner(this)

        pointLabelInput = textInput("Point label, e.g. Main Gate")
        pointNotesInput = textInput("Point notes")
        routeLabelInput = textInput("Route label, e.g. Gate to Library")
        routeNotesInput = textInput("Route notes")

        val requestLocationButton = Button(this).apply {
            text = "Enable Location"
            setOnClickListener {
                requestPermissions(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                    ),
                    LOCATION_PERMISSION_REQUEST,
                )
            }
        }

        val savePointButton = Button(this).apply {
            text = "Save Current Point"
            setOnClickListener { saveCurrentPoint() }
        }

        startRouteButton = Button(this).apply {
            text = "Start Route"
            setOnClickListener { startRouteRecording() }
        }

        stopRouteButton = Button(this).apply {
            text = "Stop And Save Route"
            isEnabled = false
            setOnClickListener { stopRouteRecording() }
        }

        val exportButton = Button(this).apply {
            text = "Export Survey JSON"
            setOnClickListener { requestSurveyExportFile() }
        }

        val clearButton = Button(this).apply {
            text = "Clear Local Survey"
            setOnClickListener { clearSurvey() }
        }

        panel.addView(title)
        panel.addView(nativeText)
        panel.addView(sensorText)
        panel.addView(destinationSpinner)
        panel.addView(locationText)
        panel.addView(statusText)
        panel.addView(requestLocationButton)
        panel.addView(sectionLabel("Survey point"))
        panel.addView(pointLabelInput)
        panel.addView(pointCategorySpinner)
        panel.addView(pointNotesInput)
        panel.addView(savePointButton)
        panel.addView(sectionLabel("Walked route"))
        panel.addView(routeLabelInput)
        panel.addView(routeNotesInput)
        panel.addView(startRouteButton)
        panel.addView(stopRouteButton)
        panel.addView(routeStatusText)
        panel.addView(sectionLabel("Local survey file"))
        panel.addView(surveySummaryText)
        panel.addView(exportButton)
        panel.addView(clearButton)

        root.addView(
            scrollView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP,
            ),
        )

        return root
    }

    private fun statusLabel(initialText: String = ""): TextView {
        return TextView(this).apply {
            text = initialText
            textSize = 14f
            setTextColor(Color.rgb(184, 196, 204))
            setPadding(0, 8, 0, 8)
        }
    }

    private fun sectionLabel(textValue: String): TextView {
        return TextView(this).apply {
            text = textValue.uppercase()
            textSize = 12f
            setTextColor(Color.rgb(237, 161, 103))
            setPadding(0, 22, 0, 8)
        }
    }

    private fun textInput(hintValue: String): EditText {
        return EditText(this).apply {
            hint = hintValue
            textSize = 14f
            setTextColor(Color.WHITE)
            setHintTextColor(Color.rgb(132, 146, 154))
            setSingleLine(false)
            minLines = 1
            maxLines = 3
        }
    }

    private fun bindDestinationSpinner() {
        val labels = destinations.map { destination -> destination.label }
        destinationSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            labels,
        )
        destinationSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long,
            ) {
                selectedDestination = destinations.getOrNull(position)
                updateNavigationState()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
    }

    private fun bindPointCategorySpinner() {
        pointCategorySpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            POINT_CATEGORIES,
        )
    }

    private fun startLocationUpdates() {
        locationSource.start(
            onLocation = { point ->
                currentPoint = point
                locationText.text = point.toLocationText()
                maybeRecordRouteSample(point)
                updateNavigationState()
            },
            onStatus = { status ->
                statusText.text = status
            },
        )
    }

    private fun startSensorUpdates() {
        sensorSource.start(
            onSnapshot = { snapshot ->
                latestSensorSnapshot = snapshot
                updateSensorStatus()
            },
            onStatus = { status ->
                sensorText.text = status
            },
        )
    }

    private fun updateNativeStatus() {
        val versionCode = nativeEngine.engineVersionCodeOrNull()
        nativeText.text = if (versionCode == null) {
            "Native engine: library not packaged yet"
        } else {
            "Native engine: v$versionCode loaded"
        }
    }

    private fun updateSensorStatus() {
        val availability = sensorAvailability
        val accelerometer = latestSensorSnapshot.accelerometer
        val gyroscope = latestSensorSnapshot.gyroscope
        val magnetometer = latestSensorSnapshot.magnetometer

        val accelerationDelta = accelerometer?.let { reading ->
            nativeEngine.accelerationDeltaFromGravityOrNull(reading.x, reading.y, reading.z)
        }
        val gyroMagnitude = gyroscope?.let { reading ->
            nativeEngine.gyroMagnitudeOrNull(reading.x, reading.y, reading.z)
        }
        val motionState = if (accelerationDelta != null && gyroMagnitude != null) {
            nativeEngine.motionStateOrUnknown(accelerationDelta, gyroMagnitude)
        } else {
            MOTION_STATE_UNKNOWN
        }
        val headingConfidence = magnetometer?.let { reading ->
            nativeEngine.headingConfidenceOrZero(reading.accuracy)
        } ?: 0.0
        val stepLength = nativeEngine.estimatedStepLengthMetersOrDefault(
            DEFAULT_USER_HEIGHT_METERS,
            motionState,
        )

        sensorText.text = buildString {
            append("Sensors: ")
            if (availability == null) {
                append("checking")
            } else {
                append("acc=${availability.accelerometer.yesNo()}, ")
                append("gyro=${availability.gyroscope.yesNo()}, ")
                append("mag=${availability.magnetometer.yesNo()}, ")
                append("baro=${availability.barometer.yesNo()}")
            }
            append("\nMotion: ${motionStateLabel(motionState)}")
            append(", heading confidence %.2f".format(headingConfidence))
            append(", step %.2f m".format(stepLength))
        }
    }

    private fun updateNavigationState() {
        val point = currentPoint
        val destination = selectedDestination
        val state = if (point != null && destination != null) {
            nativeEngine.overlayStateOrNull(point, currentHeadingDegrees, destination)
        } else {
            null
        }

        compassOverlay.updateState(state, destination?.label ?: "No destination")
        updateStatusText(state, destination)
    }

    private fun updateStatusText(
        state: NavigationOverlayState?,
        destination: Destination?,
    ) {
        statusText.text = when {
            destination == null -> "No seed destination available."
            currentPoint == null -> "Waiting for GPS location."
            state == null -> "Native overlay state unavailable. Build and package Rust .so."
            state.arrival -> "Arrived at ${destination.label}."
            else -> "${state.distanceMeters.toInt()} m, bearing ${state.bearingDegrees.toInt()} deg."
        }
    }

    private fun saveCurrentPoint() {
        val point = currentPoint
        if (point == null) {
            statusText.text = "Cannot save point until GPS location is available."
            return
        }

        surveyExport = surveyRepository.addPoint(
            label = pointLabelInput.text.toString().trim(),
            categoryKey = pointCategorySpinner.selectedItem?.toString() ?: "other",
            position = point,
            notes = pointNotesInput.text.toString().trim(),
        )
        pointLabelInput.text.clear()
        pointNotesInput.text.clear()
        updateSurveySummary()
        statusText.text = "Saved survey point ${surveyExport?.points?.lastOrNull()?.localId ?: ""}."
    }

    private fun startRouteRecording() {
        if (currentPoint == null) {
            statusText.text = "Cannot start route until GPS location is available."
            return
        }

        isRecordingRoute = true
        routeSamples = mutableListOf()
        lastRouteSample = null
        currentPoint?.let { point -> maybeRecordRouteSample(point, force = true) }
        startRouteButton.isEnabled = false
        stopRouteButton.isEnabled = true
        routeStatusText.text = "Route recorder: recording 1 sample"
    }

    private fun stopRouteRecording() {
        if (!isRecordingRoute) {
            return
        }

        isRecordingRoute = false
        startRouteButton.isEnabled = true
        stopRouteButton.isEnabled = false

        if (routeSamples.size < MIN_ROUTE_SAMPLES) {
            routeSamples = mutableListOf()
            routeStatusText.text = "Route recorder: discarded, not enough samples"
            statusText.text = "Walk a little longer before saving a route."
            return
        }

        surveyExport = surveyRepository.addRoute(
            label = routeLabelInput.text.toString().trim(),
            fromLocalPointId = surveyExport?.points?.lastOrNull()?.localId,
            toLocalPointId = null,
            samples = routeSamples.toList(),
            notes = routeNotesInput.text.toString().trim(),
        )
        routeLabelInput.text.clear()
        routeNotesInput.text.clear()
        routeSamples = mutableListOf()
        lastRouteSample = null
        updateSurveySummary()
        routeStatusText.text = "Route recorder: idle"
        statusText.text = "Saved route ${surveyExport?.routes?.lastOrNull()?.localId ?: ""}."
    }

    private fun maybeRecordRouteSample(point: GeoPoint, force: Boolean = false) {
        if (!isRecordingRoute) {
            return
        }

        val last = lastRouteSample
        if (!force && last != null && distanceMeters(last, point) < ROUTE_SAMPLE_DISTANCE_METERS) {
            return
        }

        routeSamples.add(
            SurveyRouteSample(
                position = point,
                capturedAtEpochMillis = point.capturedAtEpochMillis,
            ),
        )
        lastRouteSample = point
        routeStatusText.text = "Route recorder: recording ${routeSamples.size} samples"
    }

    private fun requestSurveyExportFile() {
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "application/json"
            putExtra(Intent.EXTRA_TITLE, surveyRepository.exportFileName())
        }
        startActivityForResult(intent, EXPORT_SURVEY_REQUEST)
    }

    private fun writeSurveyExport(uri: Uri) {
        runCatching {
            contentResolver.openOutputStream(uri)?.use { outputStream ->
                outputStream.write(surveyRepository.exportJsonString().toByteArray(Charsets.UTF_8))
            } ?: error("Unable to open export file.")
        }.onSuccess {
            statusText.text = "Survey JSON exported."
        }.onFailure { throwable ->
            statusText.text = "Export failed: ${throwable.message}"
        }
    }

    private fun clearSurvey() {
        surveyExport = surveyRepository.clear()
        routeSamples = mutableListOf()
        lastRouteSample = null
        isRecordingRoute = false
        startRouteButton.isEnabled = true
        stopRouteButton.isEnabled = false
        updateSurveySummary()
        statusText.text = "Local survey data cleared."
    }

    private fun updateSurveySummary() {
        val current = surveyExport ?: surveyRepository.loadExport().also { surveyExport = it }
        surveySummaryText.text = "Survey: ${current.points.size} points, ${current.routes.size} routes"
    }

    private fun GeoPoint.toLocationText(): String {
        val accuracy = accuracyMeters?.let { value -> ", acc ${value.toInt()} m" }.orEmpty()
        return "Current location: %.7f, %.7f%s".format(latitude, longitude, accuracy)
    }

    private fun distanceMeters(a: GeoPoint, b: GeoPoint): Double {
        val earthRadiusMeters = 6_371_000.0
        val lat1 = Math.toRadians(a.latitude)
        val lat2 = Math.toRadians(b.latitude)
        val deltaLat = Math.toRadians(b.latitude - a.latitude)
        val deltaLon = Math.toRadians(b.longitude - a.longitude)
        val sinLat = kotlin.math.sin(deltaLat / 2.0)
        val sinLon = kotlin.math.sin(deltaLon / 2.0)
        val h = sinLat * sinLat +
            kotlin.math.cos(lat1) * kotlin.math.cos(lat2) * sinLon * sinLon
        return 2.0 * earthRadiusMeters * kotlin.math.atan2(kotlin.math.sqrt(h), kotlin.math.sqrt(1.0 - h))
    }

    private fun Boolean.yesNo(): String {
        return if (this) "yes" else "no"
    }

    private fun motionStateLabel(motionState: Int): String {
        return when (motionState) {
            MOTION_STATE_IDLE -> "idle"
            MOTION_STATE_WALKING -> "walking"
            MOTION_STATE_ACTIVE -> "active"
            else -> "unknown"
        }
    }

    private companion object {
        const val LOCATION_PERMISSION_REQUEST = 1001
        const val EXPORT_SURVEY_REQUEST = 2001
        const val ROUTE_SAMPLE_DISTANCE_METERS = 3.0
        const val MIN_ROUTE_SAMPLES = 2
        const val DEFAULT_USER_HEIGHT_METERS = 1.7
        const val MOTION_STATE_UNKNOWN = 0
        const val MOTION_STATE_IDLE = 1
        const val MOTION_STATE_WALKING = 2
        const val MOTION_STATE_ACTIVE = 3

        val POINT_CATEGORIES = listOf(
            "gate",
            "building",
            "building_entrance",
            "landmark",
            "path_node",
            "canteen",
            "parking",
            "junction",
            "other",
        )
    }
}
