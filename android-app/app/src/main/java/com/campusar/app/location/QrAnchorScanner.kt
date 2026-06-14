package com.campusar.app.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Size
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import com.campusar.app.data.FingerprintCacheRepository
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

data class QrSnapEvent(
    val codeKey: String,
    val latitude: Double,
    val longitude: Double,
    val floorIndex: Int,
    val timestamp: Long,
)

class QrAnchorScanner(
    private val context: Context,
    private val cacheRepo: FingerprintCacheRepository?,
) {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private var scanner: BarcodeScanner? = null
    private var onSnapCallback: ((QrSnapEvent) -> Unit)? = null
    private var onStatusCallback: ((String) -> Unit)? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var lifecycleRegistry: LifecycleRegistry? = null
    private var previewView: PreviewView? = null
    private var scanning = AtomicBoolean(false)

    fun hasCameraPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
    }

    fun startScanning(
        container: ViewGroup,
        onSnap: (QrSnapEvent) -> Unit,
        onStatus: (String) -> Unit,
    ) {
        if (scanning.get()) return

        if (!hasCameraPermission()) {
            onStatus("Camera permission is required for QR anchor scanning.")
            return
        }

        this.onSnapCallback = onSnap
        this.onStatusCallback = onStatus

        scanner = BarcodeScanning.getClient()

        val registry = LifecycleRegistry(SimpleLifecycleOwner())
        lifecycleRegistry = registry

        previewView = PreviewView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }
        container.removeAllViews()
        container.addView(previewView)

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener(
            {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                bindCamera(provider, registry)
                onStatus("QR scanner ready.")
            },
            ContextCompat.getMainExecutor(context),
        )
        scanning.set(true)
        onStatus("QR scanner initialising camera...")
    }

    fun stopScanning() {
        if (!scanning.compareAndSet(true, false)) return

        analysisExecutor.execute {
            scanner?.close()
            scanner = null
        }

        cameraProvider?.unbindAll()
        cameraProvider = null
        lifecycleRegistry?.currentState = Lifecycle.State.DESTROYED
        lifecycleRegistry = null

        previewView?.let { pv ->
            val parent = pv.parent as? ViewGroup
            parent?.removeView(pv)
        }
        previewView = null

        onSnapCallback = null
        onStatusCallback = null
    }

    private fun bindCamera(provider: ProcessCameraProvider, lifecycle: Lifecycle) {
        val selector = CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_BACK)
            .build()

        val preview = Preview.Builder()
            .build()

        preview.surfaceProvider = previewView?.surfaceProvider

        val analysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        analysis.setAnalyzer(analysisExecutor) { imageProxy ->
            processImage(imageProxy)
        }

        val lifecycleOwner = object : LifecycleOwner {
            override val lifecycle: Lifecycle = lifecycle
        }

        try {
            provider.unbindAll()
            provider.bindToLifecycle(lifecycleOwner, selector, preview, analysis)
        } catch (e: Exception) {
            onStatusCallback?.invoke("Camera bind failed: ${e.message}")
        }
    }

    private fun processImage(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || mediaImage.format != ImageFormat.YUV_420_888) {
            imageProxy.close()
            return
        }

        if (!scanning.get()) {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        val currentScanner = scanner ?: run {
            imageProxy.close()
            return
        }

        currentScanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue ?: continue
                    if (rawValue.startsWith(ANCHOR_PREFIX)) {
                        handleAnchorScan(rawValue, imageProxy.imageInfo.timestamp)
                        break
                    }
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    private fun handleAnchorScan(rawValue: String, timestampNanos: Long) {
        val codeKey = rawValue.removePrefix(ANCHOR_PREFIX)
        if (codeKey.isBlank()) {
            onStatusCallback?.invoke("Empty QR anchor key.")
            return
        }

        val anchor = cacheRepo?.findQrAnchor(codeKey)
        if (anchor == null) {
            onStatusCallback?.invoke("Unknown QR anchor: $codeKey")
            return
        }

        val event = QrSnapEvent(
            codeKey = codeKey,
            latitude = anchor.latitude,
            longitude = anchor.longitude,
            floorIndex = anchor.floorIndex,
            timestamp = if (timestampNanos > 0) timestampNanos / 1_000_000L else System.currentTimeMillis(),
        )

        runCatching {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator?
            vibrator?.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE))
        }

        onSnapCallback?.invoke(event)
        onStatusCallback?.invoke("QR snap: $codeKey → ${anchor.label}")
    }

    companion object {
        const val ANCHOR_PREFIX = "campusar:anchor:"
    }

    private class SimpleLifecycleOwner : LifecycleOwner {
        override val lifecycle: Lifecycle = LifecycleRegistry(this).apply {
            handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        }
    }
}
