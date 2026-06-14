package com.campusar.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.campusar.app.model.NavigationOverlayState
import kotlin.math.abs
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

    @Volatile
    private var currentFloor: Int = 0

    @Volatile
    private var targetFloor: Int? = null

    @Volatile
    private var positionSource: String = "gps"

    private var floorHighlightAlpha: Float = 0f
    private var lastFloorChangeNanos: Long = 0L

    private var renderThread: Thread? = null

    private val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_SIGNAL
        strokeWidth = 6f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_RING
        strokeWidth = 1.4f
        style = Paint.Style.STROKE
    }

    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_GRID
        strokeWidth = 1f
        style = Paint.Style.STROKE
    }

    private val horizonPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val overlayTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_TEXT_SECONDARY
        textSize = 23f
        typeface = Typeface.MONOSPACE
    }

    private val floorLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_SIGNAL
        textSize = 42f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    }

    private val floorSubPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_TEXT_SECONDARY
        textSize = 16f
        typeface = Typeface.MONOSPACE
    }

    private val floorHighlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_SIGNAL_HIGHLIGHT
        textSize = 42f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    }

    private val sourcePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_TEXT_MUTED
        textSize = 13f
        typeface = Typeface.MONOSPACE
    }

    private val backgroundPaint = Paint().apply {
        color = COLOR_BACKGROUND
        style = Paint.Style.FILL
    }

    init {
        holder.addCallback(this)
    }

    fun updateState(state: NavigationOverlayState?, label: String) {
        overlayState = state
        destinationLabel = label
    }

    fun updateFloor(current: Int, target: Int?) {
        if (current != currentFloor) {
            lastFloorChangeNanos = System.nanoTime()
        }
        currentFloor = current
        targetFloor = target
    }

    fun updatePositionSource(source: String) {
        positionSource = source
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
        drawSignalField(canvas)

        drawFloorIndicator(canvas)
        drawPositionSource(canvas)

        val state = overlayState
        if (state == null) {
            drawPendingState(canvas)
            return
        }

        val centerX = width / 2f
        val centerY = height * 0.42f
        val arrowLength = min(width, height) * 0.28f * state.proximityScale.toFloat()

        arrowPaint.color = if (state.arrival) {
            COLOR_CYAN
        } else {
            interpolateArrowColor(state.distanceMeters)
        }

        if (state.arrival) {
            val radius = min(width, height) * 0.18f
            canvas.drawCircle(centerX, centerY, radius, arrowPaint)
            canvas.drawCircle(centerX, centerY, radius + 14f, ringPaint)
        } else {
            drawArrow(canvas, centerX, centerY, arrowLength, state.headingDeltaDegrees)
            drawBearingTicks(canvas, centerX, centerY, state.headingDeltaDegrees)
        }
    }

    private fun drawFloorIndicator(canvas: Canvas) {
        val x = dp(20)
        val y = dp(40)
        val floorLabel = floorDisplayName(currentFloor)

        val dtNanos = System.nanoTime() - lastFloorChangeNanos
        val highlightDurationNanos = 800_000_000L
        val highlightAlpha = if (dtNanos < highlightDurationNanos) {
            1.0f - (dtNanos.toFloat() / highlightDurationNanos.toFloat())
        } else {
            0f
        }

        val paint = if (highlightAlpha > 0f) {
            floorHighlightPaint.alpha = (highlightAlpha * 255).toInt().coerceIn(0, 255)
            floorHighlightPaint
        } else {
            floorLabelPaint
        }

        canvas.drawText(floorLabel, x, y, paint)

        // Draw target floor hint if different
        val target = targetFloor
        if (target != null && target != currentFloor) {
            val targetLabel = floorDisplayName(target)
            canvas.drawText("→ F$targetLabel", x + dp(50), y, floorSubPaint)
        }

        // Draw destination label below floor
        canvas.drawText(destinationLabel, x, y + dp(36), overlayTextPaint)
    }

    private fun drawPositionSource(canvas: Canvas) {
        val x = width - dp(16)
        val y = height - dp(24)
        val label = positionSource.uppercase()
        sourcePaint.textAlign = Paint.Align.RIGHT
        canvas.drawText(label, x.toFloat(), y.toFloat(), sourcePaint)
        sourcePaint.textAlign = Paint.Align.LEFT
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

    private fun dp(value: Int): Float {
        return (value * resources.displayMetrics.density)
    }

    private fun drawSignalField(canvas: Canvas) {
        val widthF = width.toFloat()
        val heightF = height.toFloat()
        horizonPaint.shader = LinearGradient(
            0f,
            heightF * 0.16f,
            0f,
            heightF,
            intArrayOf(
                Color.argb(0, 238, 154, 78),
                Color.argb(82, 238, 154, 78),
                Color.argb(0, 238, 154, 78),
            ),
            floatArrayOf(0f, 0.58f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, 0f, widthF, heightF, horizonPaint)

        val centerX = widthF / 2f
        val centerY = heightF * 0.42f
        val maxRadius = min(widthF, heightF) * 0.46f
        for (i in 1..4) {
            val radius = maxRadius * i / 4f
            ringPaint.alpha = 46 - i * 5
            canvas.drawCircle(centerX, centerY, radius, ringPaint)
        }
        ringPaint.alpha = 255

        val spacing = 48f
        var x = centerX % spacing
        while (x < widthF) {
            gridPaint.alpha = if (abs(x - centerX) < 1f) 42 else 18
            canvas.drawLine(x, 0f, x, heightF, gridPaint)
            x += spacing
        }
        var y = centerY % spacing
        while (y < heightF) {
            gridPaint.alpha = if (abs(y - centerY) < 1f) 42 else 18
            canvas.drawLine(0f, y, widthF, y, gridPaint)
            y += spacing
        }
        gridPaint.alpha = 255

        drawNoise(canvas, widthF, heightF)
    }

    private fun drawNoise(canvas: Canvas, widthF: Float, heightF: Float) {
        gridPaint.style = Paint.Style.FILL
        gridPaint.color = Color.argb(14, 247, 243, 232)
        val step = 31
        var seed = 17
        var y = 9
        while (y < heightF.toInt()) {
            var x = 11
            while (x < widthF.toInt()) {
                seed = (seed * 1103515245 + 12345)
                if ((seed ushr 28) % 5 == 0) {
                    canvas.drawPoint(x.toFloat(), y.toFloat(), gridPaint)
                }
                x += step
            }
            y += step
        }
        gridPaint.style = Paint.Style.STROKE
        gridPaint.color = COLOR_GRID
    }

    private fun drawPendingState(canvas: Canvas) {
        val centerX = width / 2f
        val centerY = height * 0.42f
        val radius = min(width, height) * 0.18f
        arrowPaint.color = COLOR_SIGNAL
        canvas.drawArc(
            RectF(centerX - radius, centerY - radius, centerX + radius, centerY + radius),
            -48f,
            112f,
            false,
            arrowPaint,
        )
        canvas.drawText("native signal pending", 32f, height * 0.31f, overlayTextPaint)
        canvas.drawText(destinationLabel, 32f, height * 0.31f + 34f, overlayTextPaint)
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

    private fun drawBearingTicks(
        canvas: Canvas,
        centerX: Float,
        centerY: Float,
        headingDeltaDegrees: Double,
    ) {
        val radius = min(width, height) * 0.34f
        val activeIndex = (((headingDeltaDegrees % 360.0) + 360.0) / 30.0).toInt() % 12
        for (i in 0 until 12) {
            val angle = Math.toRadians(i * 30.0 - 90.0)
            val tickLength = if (i == activeIndex) 22f else 12f
            gridPaint.color = if (i == activeIndex) COLOR_SIGNAL else COLOR_GRID
            gridPaint.alpha = if (i == activeIndex) 210 else 96
            gridPaint.strokeWidth = if (i == activeIndex) 3f else 1.2f
            val outerX = centerX + cos(angle).toFloat() * radius
            val outerY = centerY + sin(angle).toFloat() * radius
            val innerX = centerX + cos(angle).toFloat() * (radius - tickLength)
            val innerY = centerY + sin(angle).toFloat() * (radius - tickLength)
            canvas.drawLine(innerX, innerY, outerX, outerY, gridPaint)
        }
        gridPaint.color = COLOR_GRID
        gridPaint.alpha = 255
        gridPaint.strokeWidth = 1f
    }

    private fun interpolateArrowColor(distanceMeters: Double): Int {
        val progress = when {
            distanceMeters <= 5.0 -> 1.0
            distanceMeters >= 50.0 -> 0.0
            else -> (50.0 - distanceMeters) / 45.0
        }
        val red = interpolate(238, 168, progress)
        val green = interpolate(154, 240, progress)
        val blue = interpolate(78, 232, progress)
        return Color.rgb(red, green, blue)
    }

    private fun interpolate(start: Int, end: Int, progress: Double): Int {
        return (start + (end - start) * progress).toInt().coerceIn(0, 255)
    }

    private companion object {
        const val FRAME_DELAY_MILLIS = 16L
        const val ARROW_HEAD_LENGTH = 42f
        val COLOR_BACKGROUND: Int = Color.rgb(7, 10, 11)
        val COLOR_GRID: Int = Color.rgb(83, 94, 88)
        val COLOR_RING: Int = Color.rgb(238, 154, 78)
        val COLOR_SIGNAL: Int = Color.rgb(238, 154, 78)
        val COLOR_SIGNAL_HIGHLIGHT: Int = Color.argb(255, 255, 184, 108)
        val COLOR_CYAN: Int = Color.rgb(168, 240, 232)
        val COLOR_TEXT_SECONDARY: Int = Color.rgb(186, 195, 190)
        val COLOR_TEXT_MUTED: Int = Color.rgb(115, 127, 124)
        val ARROW_HEAD_RADIANS: Double = Math.toRadians(34.0)
    }
}
