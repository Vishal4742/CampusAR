package com.campusar.app.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import com.campusar.app.model.GeoPoint

class GpsLocationSource(private val context: Context) {
    private val locationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    private var listener: LocationListener? = null

    fun hasLocationPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    fun start(
        onLocation: (GeoPoint) -> Unit,
        onStatus: (String) -> Unit,
    ) {
        if (!hasLocationPermission()) {
            onStatus("Location permission is not granted.")
            return
        }

        val provider = selectProvider()
        if (provider == null) {
            onStatus("No GPS or network location provider is enabled.")
            return
        }

        listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                onLocation(location.toGeoPoint())
            }

            override fun onProviderEnabled(provider: String) {
                onStatus("$provider enabled.")
            }

            override fun onProviderDisabled(provider: String) {
                onStatus("$provider disabled.")
            }

            @Deprecated("Deprecated by Android framework, retained for API 26.")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
        }

        locationManager.getLastKnownLocation(provider)?.let { location ->
            onLocation(location.toGeoPoint())
        }

        locationManager.requestLocationUpdates(
            provider,
            MIN_TIME_MILLIS,
            MIN_DISTANCE_METERS,
            listener as LocationListener,
        )
        onStatus("Listening for $provider updates.")
    }

    fun stop() {
        listener?.let { currentListener ->
            locationManager.removeUpdates(currentListener)
        }
        listener = null
    }

    private fun selectProvider(): String? {
        return when {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ->
                LocationManager.GPS_PROVIDER
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ->
                LocationManager.NETWORK_PROVIDER
            else -> null
        }
    }

    private fun Location.toGeoPoint(): GeoPoint {
        return GeoPoint(latitude = latitude, longitude = longitude)
    }

    private companion object {
        const val MIN_TIME_MILLIS = 1_000L
        const val MIN_DISTANCE_METERS = 1.0f
    }
}
