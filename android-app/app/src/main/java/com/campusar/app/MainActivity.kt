package com.campusar.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Space
import android.widget.Spinner
import android.widget.TextView
import com.campusar.app.data.BackendSyncRepository
import com.campusar.app.data.DestinationRepository
import com.campusar.app.data.FingerprintCacheRepository
import com.campusar.app.data.MapCacheRepository
import com.campusar.app.data.SurveyRepository
import com.campusar.app.location.DeviceSensorSource
import com.campusar.app.location.FusedPosition
import com.campusar.app.location.GpsLocationSource
import com.campusar.app.location.PositionSource
import com.campusar.app.location.QrAnchorScanner
import com.campusar.app.location.QrSnapEvent
import com.campusar.app.location.SensorFusionPipeline
import com.campusar.app.location.WifiScanSource
import com.campusar.app.location.WifiScanSnapshot
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
    private lateinit var mapCache: MapCacheRepository
    private lateinit var surveyRepository: SurveyRepository
    private lateinit var compassOverlay: CompassOverlaySurfaceView
    private lateinit var statusText: TextView
    private lateinit var locationText: TextView
    private lateinit var nativeText: TextView
    private lateinit var sensorText: TextView
    private lateinit var surveySummaryText: TextView
    private lateinit var routeStatusText: TextView
    private lateinit var destinationMetaText: TextView
    private lateinit var navigationMetricText: TextView
    private lateinit var mapCacheText: TextView
    private lateinit var destinationSpinner: Spinner
    private lateinit var pointCategorySpinner: Spinner
    private lateinit var pointLabelInput: EditText
    private lateinit var pointNotesInput: EditText
    private lateinit var routeLabelInput: EditText
    private lateinit var routeNotesInput: EditText
    private lateinit var startRouteButton: Button
    private lateinit var stopRouteButton: Button
    private lateinit var qrScanButton: Button
    private lateinit var positionSourceText: TextView

    // Phase 2 resources
    private var wifiScanSource: WifiScanSource? = null
    private var sensorFusionPipeline: SensorFusionPipeline? = null
    private var qrAnchorScanner: QrAnchorScanner? = null
    private var fingerprintCacheRepo: FingerprintCacheRepository? = null
    private var qrScanContainer: FrameLayout? = null
    private var fusedPosition: FusedPosition? = null
    private lateinit var rootLayout: FrameLayout

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
        mapCache = MapCacheRepository(this)
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
        updateMapCacheText()

        if (mapCache.locationCount() == 0) {
            triggerFirstLaunchSync()
        }

        initPhase2()
    }

    private fun initPhase2() {
        if (!nativeEngine.nativeReady) {
            sensorText.text = "Phase 2: native library not loaded, GPS-only fallback"
            return
        }

        fingerprintCacheRepo = FingerprintCacheRepository(this, nativeEngine)
        wifiScanSource = WifiScanSource(this)

        val pipeline = SensorFusionPipeline(
            native = nativeEngine,
            wifiScanner = wifiScanSource!!,
            sensorSource = sensorSource,
        )
        sensorFusionPipeline = pipeline

        qrAnchorScanner = QrAnchorScanner(this, fingerprintCacheRepo)

        // Start position source updates
        pipeline.start(
            onPosition = { position ->
                fusedPosition = position
                runOnUiThread {
                    updateFusedNavigation(position)
                }
            },
            onStatus = { msg ->
                runOnUiThread {
                    statusText.text = msg
                }
            },
        )

        // Connect WiFi scanner to pipeline
        wifiScanSource?.start(
            onResults = { snapshot ->
                pipeline.onWifiScanSnapshot(snapshot)
            },
            onStatus = { msg ->
                runOnUiThread {
                    statusText.text = "WiFi: $msg"
                }
            },
        )

        // Load cached fingerprint data into native engine
        fingerprintCacheRepo?.loadCachedIntoNative()

        // Refresh fingerprint data from backend in background
        val backendUrl = getString(R.string.backend_base_url)
        if (backendUrl.isNotBlank()) {
            Thread {
                val result = fingerprintCacheRepo?.refreshFromBackend(backendUrl)
                runOnUiThread {
                    if (result != null) {
                        statusText.text = "Fingerprint cache: ${result.wifiFingerprints} WiFi, ${result.magneticFingerprints} mag, ${result.floorProfiles} floors, ${result.qrAnchors} QR"
                    }
                }
            }.start()
        }

        sensorText.text = "Phase 2 sensor fusion active"
    }

    private fun toggleQrScanner() {
        if (qrAnchorScanner == null) return

        if (qrScanContainer != null) {
            // Stop scanning
            qrAnchorScanner?.stopScanning()
            rootLayout.removeView(qrScanContainer)
            qrScanContainer = null
            qrScanButton.text = "SCAN QR"
            compassOverlay.visibility = View.VISIBLE
        } else {
            if (!qrAnchorScanner!!.hasCameraPermission()) {
                requestPermissions(
                    arrayOf(Manifest.permission.CAMERA),
                    CAMERA_PERMISSION_REQUEST,
                )
                return
            }

            val container = FrameLayout(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                )
                background = android.graphics.drawable.ColorDrawable(
                    android.graphics.Color.argb(220, 0, 0, 0)
                )
            }
            qrScanContainer = container
            rootLayout.addView(container)
            compassOverlay.visibility = View.INVISIBLE
            qrScanButton.text = "STOP QR"

            qrAnchorScanner?.startScanning(
                container = container,
                onSnap = { event ->
                    pipeline()?.onQrSnap(event)
                    runOnUiThread {
                        toggleQrScanner() // Auto-close scanner after snap
                    }
                },
                onStatus = { msg ->
                    runOnUiThread {
                        statusText.text = "QR: $msg"
                    }
                },
            )
        }
    }

    private fun pipeline(): SensorFusionPipeline? = sensorFusionPipeline

    private fun updateFusedNavigation(position: FusedPosition) {
        val sourceLabel = when (position.source) {
            PositionSource.GPS -> "gps"
            PositionSource.PDR -> "pdr"
            PositionSource.WIFI -> "wifi"
            PositionSource.MAGNETIC -> "mag"
            PositionSource.QR_SNAP -> "qr"
            PositionSource.FUSED -> "fused"
        }
        positionSourceText.text = "source $sourceLabel / floor ${floorDisplayName(position.floorIndex)}"

        compassOverlay.updateFloor(position.floorIndex, selectedDestination?.floor?.takeIf { it != position.floorIndex })
        compassOverlay.updatePositionSource(sourceLabel)

        // Update existing navigation state using fused position
        val destination = selectedDestination
        if (destination != null) {
            val state = nativeEngine.overlayStateOrNull(
                GeoPoint(position.latitude, position.longitude),
                position.headingDegrees,
                destination,
            )
            compassOverlay.updateState(state, destination.label)
            destinationMetaText.text = "target ${destination.id} / ${destination.category} / floor ${destination.floor}"
            navigationMetricText.text = if (state != null) {
                "${state.distanceMeters.toInt()} m / bearing ${state.bearingDegrees.toInt()} deg"
            } else {
                "${position.latitude.toInt()} lat / ${position.longitude.toInt()} lon"
            }
            locationText.text = "Fused: %.7f, %.7f (${sourceLabel})".format(
                position.latitude, position.longitude,
            )
        }
    }

    private fun floorDisplayName(floorIndex: Int): String {
        return when (floorIndex) {
            0 -> "G"
            -1 -> "B1"
            -2 -> "B2"
            1 -> "1"
            2 -> "2"
            3 -> "3"
            4 -> "4"
            5 -> "5"
            else -> floorIndex.toString()
        }
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
        wifiScanSource?.stop()
        sensorFusionPipeline?.stop()
        qrAnchorScanner?.stopScanning()
        qrScanContainer?.let { container ->
            runCatching { rootLayout.removeView(container) }
            qrScanContainer = null
        }
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
        } else if (requestCode == CAMERA_PERMISSION_REQUEST) {
            val granted = grantResults.any { result -> result == PackageManager.PERMISSION_GRANTED }
            if (granted) {
                toggleQrScanner()
            } else {
                statusText.text = "Camera permission denied. QR scanning unavailable."
            }
        }
    }

    private fun buildContentView(): View {
        compassOverlay = CompassOverlaySurfaceView(this)

        rootLayout = FrameLayout(this).apply {
            setBackgroundColor(COLOR_GRAPHITE)
        }

        rootLayout.addView(
            compassOverlay,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        val shell = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(14))
            clipToPadding = false
        }

        rootLayout.addView(
            shell,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        shell.addView(topBar())

        nativeText = telemetryLabel()
        sensorText = telemetryLabel()
        mapCacheText = telemetryLabel("cache seed / loc -- / edges --")

        val telemetryStrip = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = panelBackground(Color.argb(174, 12, 17, 18), COLOR_AMBER_DIM)
            addView(nativeText)
            addView(sensorText)
            addView(mapCacheText)
        }

        shell.addView(
            telemetryStrip,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply {
                topMargin = dp(10)
            },
        )

        shell.addView(
            Space(this),
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                0.72f,
            ),
        )

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(16))
        }

        val scrollView = ScrollView(this).apply {
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            background = consoleBackground()
            addView(
                panel,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                ),
            )
        }

        locationText = statusLabel("Current location: waiting")
        statusText = statusLabel("Select a destination and grant location permission.")
        surveySummaryText = statusLabel()
        routeStatusText = statusLabel("Route recorder: idle")
        destinationMetaText = metadataLabel("target none / coord unknown")
        navigationMetricText = metricLabel("gps pending / bearing --")

        destinationSpinner = Spinner(this).apply {
            background = inputBackground()
            setPadding(dp(10), 0, dp(10), 0)
        }
        pointCategorySpinner = Spinner(this).apply {
            background = inputBackground()
            setPadding(dp(10), 0, dp(10), 0)
        }

        pointLabelInput = textInput("Point label, e.g. Main Gate")
        pointNotesInput = textInput("Point notes")
        routeLabelInput = textInput("Route label, e.g. Gate to Library")
        routeNotesInput = textInput("Route notes")

        val requestLocationButton = actionButton("Enable GPS", primary = true).apply {
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

        qrScanButton = actionButton("Scan QR", primary = false).apply {
            setOnClickListener { toggleQrScanner() }
        }

        positionSourceText = telemetryLabel("source gps / floor G")

        val savePointButton = actionButton("Log Point", primary = true).apply {
            setOnClickListener { saveCurrentPoint() }
        }

        startRouteButton = actionButton("Start Route", primary = true).apply {
            setOnClickListener { startRouteRecording() }
        }

        stopRouteButton = actionButton("Stop And Save", primary = false).apply {
            setControlEnabled(this, enabled = false)
            setOnClickListener { stopRouteRecording() }
        }

        val exportButton = actionButton("Export JSON", primary = false).apply {
            setOnClickListener { requestSurveyExportFile() }
        }

        val clearButton = actionButton("Clear Survey", primary = false).apply {
            setOnClickListener { clearSurvey() }
        }

        panel.addConsoleView(sectionLabel("Navigation"))
        panel.addConsoleView(destinationSpinner, topMarginDp = 8)
        panel.addConsoleView(destinationMetaText, topMarginDp = 8)
        panel.addConsoleView(navigationMetricText, topMarginDp = 4)
        panel.addConsoleView(locationText, topMarginDp = 8)
        panel.addConsoleView(positionSourceText, topMarginDp = 2)
        panel.addConsoleView(statusText, topMarginDp = 2)
        panel.addConsoleView(actionRow(requestLocationButton, qrScanButton), topMarginDp = 10)

        panel.addConsoleView(sectionLabel("Survey point"), topMarginDp = 18)
        panel.addConsoleView(pointLabelInput, topMarginDp = 8)
        panel.addConsoleView(pointCategorySpinner, topMarginDp = 8)
        panel.addConsoleView(pointNotesInput, topMarginDp = 8)
        panel.addConsoleView(actionRow(savePointButton), topMarginDp = 10)

        panel.addConsoleView(sectionLabel("Walked route"), topMarginDp = 18)
        panel.addConsoleView(routeLabelInput, topMarginDp = 8)
        panel.addConsoleView(routeNotesInput, topMarginDp = 8)
        panel.addConsoleView(actionRow(startRouteButton, stopRouteButton), topMarginDp = 10)
        panel.addConsoleView(routeStatusText, topMarginDp = 8)

        panel.addConsoleView(sectionLabel("Local survey file"), topMarginDp = 18)
        panel.addConsoleView(surveySummaryText, topMarginDp = 8)
        panel.addConsoleView(actionRow(exportButton, clearButton), topMarginDp = 10)

        shell.addView(
            scrollView,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1.08f,
            ),
        )

        return rootLayout
    }

    private fun topBar(): LinearLayout {
        val title = TextView(this).apply {
            text = "CampusAR"
            textSize = 26f
            typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
            setTextColor(COLOR_TEXT_PRIMARY)
            includeFontPadding = false
        }

        val subtitle = TextView(this).apply {
            text = "OCT / field survey / graph sparse"
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_SECONDARY)
            includeFontPadding = false
            setPadding(0, dp(3), 0, 0)
        }

        val lockup = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(title)
            addView(subtitle)
        }

        val sessionPill = TextView(this).apply {
            text = "MAP V1"
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_AMBER)
            gravity = Gravity.CENTER
            background = panelBackground(Color.argb(154, 25, 18, 14), COLOR_AMBER_DIM)
            setPadding(dp(12), dp(7), dp(12), dp(7))
            includeFontPadding = false
        }

        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(
                lockup,
                LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f,
                ),
            )
            addView(sessionPill)
        }
    }

    private fun statusLabel(initialText: String = ""): TextView {
        return TextView(this).apply {
            text = initialText
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_SECONDARY)
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, dp(2), 0, dp(2))
        }
    }

    private fun telemetryLabel(initialText: String = ""): TextView {
        return TextView(this).apply {
            text = initialText
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_SECONDARY)
            includeFontPadding = false
            setPadding(0, dp(2), 0, dp(2))
        }
    }

    private fun metadataLabel(initialText: String = ""): TextView {
        return TextView(this).apply {
            text = initialText
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_AMBER)
            includeFontPadding = false
        }
    }

    private fun metricLabel(initialText: String = ""): TextView {
        return TextView(this).apply {
            text = initialText
            textSize = 22f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setTextColor(COLOR_TEXT_PRIMARY)
            includeFontPadding = false
        }
    }

    private fun sectionLabel(textValue: String): TextView {
        return TextView(this).apply {
            text = "/// ${textValue.uppercase()}"
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_AMBER)
            letterSpacing = 0f
            includeFontPadding = false
        }
    }

    private fun textInput(hintValue: String): EditText {
        return EditText(this).apply {
            hint = hintValue
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_PRIMARY)
            setHintTextColor(COLOR_TEXT_MUTED)
            setSingleLine(false)
            minLines = 1
            maxLines = 3
            minHeight = dp(46)
            background = inputBackground()
            backgroundTintList = null
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
    }

    private fun actionButton(label: String, primary: Boolean): Button {
        return Button(this).apply {
            text = label.uppercase()
            textSize = 12f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setTextColor(if (primary) COLOR_GRAPHITE else COLOR_TEXT_PRIMARY)
            background = buttonBackground(primary)
            backgroundTintList = null
            minHeight = dp(44)
            minWidth = 0
            includeFontPadding = false
            stateListAnimator = null
        }
    }

    private fun actionRow(vararg buttons: Button): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            buttons.forEachIndexed { index, button ->
                addView(
                    button,
                    LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f,
                    ).apply {
                        if (index > 0) {
                            leftMargin = dp(8)
                        }
                    },
                )
            }
        }
    }

    private fun LinearLayout.addConsoleView(view: View, topMarginDp: Int = 0) {
        addView(
            view,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply {
                topMargin = dp(topMarginDp)
            },
        )
    }

    private fun styledSpinnerAdapter(values: List<String>): ArrayAdapter<String> {
        return object : ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, values) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                return super.getView(position, convertView, parent).also { view ->
                    styleSpinnerText(view, dropdown = false)
                }
            }

            override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View {
                return super.getDropDownView(position, convertView, parent).also { view ->
                    styleSpinnerText(view, dropdown = true)
                }
            }
        }.apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
    }

    private fun styleSpinnerText(view: View, dropdown: Boolean) {
        (view as? TextView)?.apply {
            typeface = Typeface.MONOSPACE
            textSize = 13f
            setTextColor(if (dropdown) COLOR_GRAPHITE else COLOR_TEXT_PRIMARY)
            setBackgroundColor(if (dropdown) COLOR_TEXT_PRIMARY else Color.TRANSPARENT)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
    }

    private fun consoleBackground(): GradientDrawable {
        return GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                Color.argb(238, 13, 18, 18),
                Color.argb(232, 24, 20, 16),
            ),
        ).apply {
            cornerRadius = dp(8).toFloat()
            setStroke(dp(1), COLOR_STROKE)
        }
    }

    private fun inputBackground(): GradientDrawable {
        return panelBackground(Color.argb(178, 8, 13, 14), COLOR_STROKE)
    }

    private fun buttonBackground(primary: Boolean): GradientDrawable {
        return if (primary) {
            panelBackground(COLOR_AMBER, COLOR_AMBER)
        } else {
            panelBackground(Color.argb(130, 26, 31, 31), COLOR_AMBER_DIM)
        }
    }

    private fun panelBackground(fillColor: Int, strokeColor: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(8).toFloat()
            setColor(fillColor)
            setStroke(dp(1), strokeColor)
        }
    }

    private fun setControlEnabled(button: Button, enabled: Boolean) {
        button.isEnabled = enabled
        button.alpha = if (enabled) 1f else 0.42f
    }

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

    private fun bindDestinationSpinner() {
        val labels = destinations.map { destination -> destination.label }
        destinationSpinner.adapter = styledSpinnerAdapter(labels)
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
        pointCategorySpinner.adapter = styledSpinnerAdapter(POINT_CATEGORIES)
    }

    private fun startLocationUpdates() {
        locationSource.start(
            onLocation = { point ->
                currentPoint = point
                locationText.text = point.toLocationText()
                maybeRecordRouteSample(point)
                // Feed GPS into sensor fusion pipeline
                sensorFusionPipeline?.onGpsUpdate(point)
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
                // Feed sensor data into fusion pipeline
                sensorFusionPipeline?.onSensorSnapshot(snapshot)
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
        updateDestinationMeta(destination)
        updateStatusText(state, destination)
    }

    private fun updateDestinationMeta(destination: Destination?) {
        destinationMetaText.text = if (destination == null) {
            "target none / coord unknown"
        } else {
            val coordinateStatus = if (destination.temporary) "coord provisional" else "coord verified"
            "target ${destination.id} / ${destination.category} / floor ${destination.floor} / $coordinateStatus"
        }
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
        navigationMetricText.text = when {
            destination == null -> "distance -- / bearing --"
            currentPoint == null -> "gps pending / bearing --"
            state == null -> "native pending / signal offline"
            state.arrival -> "arrived / bearing ${state.bearingDegrees.toInt()} deg"
            else -> "${state.distanceMeters.toInt()} m / bearing ${state.bearingDegrees.toInt()} deg"
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
        setControlEnabled(startRouteButton, enabled = false)
        setControlEnabled(stopRouteButton, enabled = true)
        routeStatusText.text = "Route recorder: recording 1 sample"
    }

    private fun stopRouteRecording() {
        if (!isRecordingRoute) {
            return
        }

        isRecordingRoute = false
        setControlEnabled(startRouteButton, enabled = true)
        setControlEnabled(stopRouteButton, enabled = false)

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
        setControlEnabled(startRouteButton, enabled = true)
        setControlEnabled(stopRouteButton, enabled = false)
        updateSurveySummary()
        statusText.text = "Local survey data cleared."
    }

    private fun updateSurveySummary() {
        val current = surveyExport ?: surveyRepository.loadExport().also { surveyExport = it }
        surveySummaryText.text = "Survey: ${current.points.size} points, ${current.routes.size} routes"
    }

    private fun updateMapCacheText() {
        val locations = runCatching { mapCache.locationCount() }.getOrDefault(0)
        val edges = runCatching { mapCache.edgeCount() }.getOrDefault(0)
        val source = if (locations > 0) "room" else "seed"
        mapCacheText.text = "cache $source / loc $locations / edges $edges"
    }

    private fun triggerFirstLaunchSync() {
        val backendUrl = getString(R.string.backend_base_url)
        if (backendUrl.isBlank()) return
        Thread {
            val repo = BackendSyncRepository(this, backendUrl)
            val result = repo.fullSync()
            runOnUiThread {
                if (result.success) {
                    destinations = DestinationRepository(this).loadDestinations()
                    selectedDestination = destinations.firstOrNull()
                    bindDestinationSpinner()
                    updateMapCacheText()
                    statusText.text =
                        "Synced ${result.locationCount} locations, ${result.edgeCount} edges."
                }
            }
        }.start()
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
        const val CAMERA_PERMISSION_REQUEST = 1002
        const val EXPORT_SURVEY_REQUEST = 2001
        const val ROUTE_SAMPLE_DISTANCE_METERS = 3.0
        const val MIN_ROUTE_SAMPLES = 2
        const val DEFAULT_USER_HEIGHT_METERS = 1.7
        const val MOTION_STATE_UNKNOWN = 0
        const val MOTION_STATE_IDLE = 1
        const val MOTION_STATE_WALKING = 2
        const val MOTION_STATE_ACTIVE = 3
        val COLOR_GRAPHITE: Int = Color.rgb(7, 10, 11)
        val COLOR_TEXT_PRIMARY: Int = Color.rgb(247, 243, 232)
        val COLOR_TEXT_SECONDARY: Int = Color.rgb(186, 195, 190)
        val COLOR_TEXT_MUTED: Int = Color.rgb(115, 127, 124)
        val COLOR_AMBER: Int = Color.rgb(238, 154, 78)
        val COLOR_AMBER_DIM: Int = Color.rgb(102, 67, 42)
        val COLOR_STROKE: Int = Color.rgb(55, 64, 61)

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
