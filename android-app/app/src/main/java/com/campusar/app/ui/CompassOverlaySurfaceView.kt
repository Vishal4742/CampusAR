package com.campusar.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.campusar.app.model.NavigationOverlayState
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

class CompassOverlaySurfaceView(context: Context) : SurfaceView(context), SurfaceHolder.Callback {
    @Volatile
    private var running = false

    @Volatile
    private var overlayState: NavigationOverlayState? = null

    @Volatile
    private var destinationLabel: String = "No destination"

    private var renderThread: Thread? = null

    private val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        strokeWidth = 6f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 34f
        typeface = android.graphics.Typeface.MONOSPACE
    }

    private val secondaryTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(184, 196, 204)
        textSize = 24f
        typeface = android.graphics.Typeface.MONOSPACE
    }

    private val backgroundPaint = Paint().apply {
        color = Color.rgb(16, 20, 24)
        style = Paint.Style.FILL
    }

    init {
        holder.addCallback(this)
    }

    fun updateState(state: NavigationOverlayState?, label: String) {
        overlayState = state
        destinationLabel = label
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        running = true
        renderThread = Thread(::renderLoop, "campusar-compass-render").also { thread ->
            thread.start()
        }
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) = Unit

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        running = false
        renderThread?.interrupt()
        renderThread = null
    }

    private fun renderLoop() {
        while (running) {
            val canvas = holder.lockCanvas()
            if (canvas != null) {
                try {
                    drawFrame(canvas)
                } finally {
                    holder.unlockCanvasAndPost(canvas)
                }
            }

            try {
                Thread.sleep(FRAME_DELAY_MILLIS)
            } catch (_: InterruptedException) {
                running = false
            }
        }
    }

    private fun drawFrame(canvas: Canvas) {
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)

        val state = overlayState
        if (state == null) {
            canvas.drawText("Native navigation pending", 32f, 56f, textPaint)
            canvas.drawText(destinationLabel, 32f, 96f, secondaryTextPaint)
            return
        }

        val centerX = width / 2f
        val centerY = height / 2f
        val arrowLength = min(width, height) * 0.28f * state.proximityScale.toFloat()

        arrowPaint.color = if (state.arrival) {
            Color.rgb(168, 240, 232)
        } else {
            interpolateArrowColor(state.distanceMeters)
        }

        if (state.arrival) {
            val radius = min(width, height) * 0.18f
            canvas.drawCircle(centerX, centerY, radius, arrowPaint)
        } else {
            drawArrow(canvas, centerX, centerY, arrowLength, state.headingDeltaDegrees)
        }

        val distanceText = if (state.arrival) {
            "ARRIVED"
        } else {
            "${state.distanceMeters.toInt()} m"
        }
        canvas.drawText(distanceText, 32f, 56f, textPaint)
        canvas.drawText(destinationLabel, 32f, 96f, secondaryTextPaint)
        canvas.drawText(
            "bearing ${state.bearingDegrees.toInt()} deg",
            32f,
            height - 36f,
            secondaryTextPaint,
        )
    }

    private fun drawArrow(
        canvas: Canvas,
        centerX: Float,
        centerY: Float,
        length: Float,
        headingDeltaDegrees: Double,
    ) {
        val angleRadians = Math.toRadians(headingDeltaDegrees - 90.0)
        val tipX = centerX + cos(angleRadians).toFloat() * length
        val tipY = centerY + sin(angleRadians).toFloat() * length
        val tailX = centerX - cos(angleRadians).toFloat() * (length * 0.35f)
        val tailY = centerY - sin(angleRadians).toFloat() * (length * 0.35f)

        val path = Path().apply {
            moveTo(tailX, tailY)
            lineTo(tipX, tipY)
            lineTo(
                tipX - cos(angleRadians - ARROW_HEAD_RADIANS).toFloat() * ARROW_HEAD_LENGTH,
                tipY - sin(angleRadians - ARROW_HEAD_RADIANS).toFloat() * ARROW_HEAD_LENGTH,
            )
            moveTo(tipX, tipY)
            lineTo(
                tipX - cos(angleRadians + ARROW_HEAD_RADIANS).toFloat() * ARROW_HEAD_LENGTH,
                tipY - sin(angleRadians + ARROW_HEAD_RADIANS).toFloat() * ARROW_HEAD_LENGTH,
            )
        }
        canvas.drawPath(path, arrowPaint)
    }

    private fun interpolateArrowColor(distanceMeters: Double): Int {
        val progress = when {
            distanceMeters <= 5.0 -> 1.0
            distanceMeters >= 50.0 -> 0.0
            else -> (50.0 - distanceMeters) / 45.0
        }
        val red = interpolate(255, 168, progress)
        val green = interpolate(255, 240, progress)
        val blue = interpolate(255, 232, progress)
        return Color.rgb(red, green, blue)
    }

    private fun interpolate(start: Int, end: Int, progress: Double): Int {
        return (start + (end - start) * progress).toInt().coerceIn(0, 255)
    }

    private companion object {
        const val FRAME_DELAY_MILLIS = 16L
        const val ARROW_HEAD_LENGTH = 42f
        val ARROW_HEAD_RADIANS: Double = Math.toRadians(34.0)
    }
}
