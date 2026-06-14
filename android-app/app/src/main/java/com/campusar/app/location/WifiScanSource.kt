package com.campusar.app.location

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper

data class WifiScanResult(
    val bssid: String,
    val bssidHash: Long,
    val rssiDbm: Int,
    val ssid: String,
    val frequencyMhz: Int,
)

data class WifiScanSnapshot(
    val results: List<WifiScanResult>,
    val capturedAtEpochMillis: Long,
)

class WifiScanSource(private val context: Context) {
    private val wifiManager =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private val mainHandler = Handler(Looper.getMainLooper())

    private var registered = false
    private var receiver: ScanReceiver? = null
    private var onResults: ((WifiScanSnapshot) -> Unit)? = null
    private var onStatus: ((String) -> Unit)? = null
    private var lastScanEpochMillis: Long = 0L

    fun hasWifiPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    fun isWifiEnabled(): Boolean {
        return wifiManager.isWifiEnabled
    }

    fun start(
        onResults: (WifiScanSnapshot) -> Unit,
        onStatus: (String) -> Unit,
    ) {
        this.onResults = onResults
        this.onStatus = onStatus

        if (!hasWifiPermission()) {
            onStatus("WiFi scanning requires location permission (for BSSID access).")
            return
        }

        if (!isWifiEnabled()) {
            onStatus("WiFi is disabled. Enable WiFi for fingerprint scanning.")
            return
        }

        stop()

        receiver = ScanReceiver()
        context.registerReceiver(receiver, IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION))
        registered = true

        requestScan()
        onStatus("WiFi scanner active.")
    }

    fun stop() {
        if (registered && receiver != null) {
            runCatching { context.unregisterReceiver(receiver) }
            registered = false
        }
        receiver = null
        onResults = null
        onStatus = null
    }

    fun requestScan() {
        val now = System.currentTimeMillis()
        if (now - lastScanEpochMillis < MIN_SCAN_INTERVAL_MILLIS) {
            return
        }

        runCatching {
            wifiManager.startScan()
            lastScanEpochMillis = now
        }.onFailure {
            onStatus?.invoke("Scan trigger failed: ${it.message}")
        }
    }

    companion object {
        const val MIN_SCAN_INTERVAL_MILLIS = 30_000L

        /**
         * FNV-1a 64-bit hash matching the Rust native engine's hash function.
         */
        fun fnv1aHash(input: String): Long {
            var hash = FNV_OFFSET_BASIS_64
            val bytes = input.toByteArray(Charsets.UTF_8)
            for (b in bytes) {
                hash = hash xor b.toLong()
                hash = hash * FNV_PRIME_64
            }
            return hash
        }

        private const val FNV_OFFSET_BASIS_64 = -3750763034362895579L
        private const val FNV_PRIME_64 = 1099511628211L
    }

    private inner class ScanReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val callback = onResults ?: return
            val status = onStatus

            val scanResults = runCatching { wifiManager.scanResults }
                .getOrDefault(emptyList())

            if (scanResults.isEmpty()) {
                status?.invoke("WiFi scan returned no results.")
                return
            }

            val results = scanResults.mapNotNull { result ->
                val bssid = result.BSSID.takeIf { it.isNotBlank() && it != "00:00:00:00:00:00" }
                    ?: return@mapNotNull null
                WifiScanResult(
                    bssid = bssid,
                    bssidHash = fnv1aHash(bssid),
                    rssiDbm = result.level,
                    ssid = result.SSID.ifBlank { "?" },
                    frequencyMhz = result.frequency,
                )
            }.sortedByDescending { it.rssiDbm }

            if (results.isNotEmpty()) {
                callback(
                    WifiScanSnapshot(
                        results = results,
                        capturedAtEpochMillis = System.currentTimeMillis(),
                    ),
                )
            }
        }
    }
}
