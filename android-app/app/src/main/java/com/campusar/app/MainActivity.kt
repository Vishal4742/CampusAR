package com.campusar.app

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import com.campusar.app.data.DestinationRepository
import com.campusar.app.location.GpsLocationSource
import com.campusar.app.model.Destination
import com.campusar.app.model.GeoPoint
import com.campusar.app.model.NavigationOverlayState
import com.campusar.app.nativebridge.NativeNavigationEngine
import com.campusar.app.ui.CompassOverlaySurfaceView

class MainActivity : Activity() {
    private lateinit var locationSource: GpsLocationSource
    private lateinit var nativeEngine: NativeNavigationEngine
    private lateinit var compassOverlay: CompassOverlaySurfaceView
    private lateinit var statusText: TextView
    private lateinit var locationText: TextView
    private lateinit var nativeText: TextView
    private lateinit var destinationSpinner: Spinner

    private var currentPoint: GeoPoint? = null
    private var currentHeadingDegrees: Double = 0.0
    private var selectedDestination: Destination? = null
    private var destinations: List<Destination> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nativeEngine = NativeNavigationEngine()
        locationSource = GpsLocationSource(this)
        destinations = DestinationRepository(this).loadSeedDestinations()
        selectedDestination = destinations.firstOrNull()

        setContentView(buildContentView())
        bindDestinationSpinner()
        updateNativeStatus()
        updateNavigationState()
    }

    override fun onStart() {
        super.onStart()
        if (locationSource.hasLocationPermission()) {
            startLocationUpdates()
        }
    }

    override fun onStop() {
        locationSource.stop()
        super.onStop()
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
            setBackgroundColor(Color.rgb(16, 20, 24))
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
            setBackgroundColor(Color.argb(190, 24, 32, 38))
        }

        val title = TextView(this).apply {
            text = "CampusAR Phase 1"
            textSize = 22f
            setTextColor(Color.WHITE)
        }

        nativeText = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(184, 196, 204))
        }

        locationText = TextView(this).apply {
            text = "Current location: waiting"
            textSize = 14f
            setTextColor(Color.rgb(184, 196, 204))
        }

        statusText = TextView(this).apply {
            text = "Select a destination and grant location permission."
            textSize = 14f
            setTextColor(Color.rgb(184, 196, 204))
        }

        destinationSpinner = Spinner(this)

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

        panel.addView(title)
        panel.addView(nativeText)
        panel.addView(destinationSpinner)
        panel.addView(locationText)
        panel.addView(statusText)
        panel.addView(requestLocationButton)

        root.addView(
            panel,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP,
            ),
        )

        return root
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

    private fun startLocationUpdates() {
        locationSource.start(
            onLocation = { point ->
                currentPoint = point
                locationText.text = "Current location: ${point.latitude}, ${point.longitude}"
                updateNavigationState()
            },
            onStatus = { status ->
                statusText.text = status
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

    private companion object {
        const val LOCATION_PERMISSION_REQUEST = 1001
    }
}
