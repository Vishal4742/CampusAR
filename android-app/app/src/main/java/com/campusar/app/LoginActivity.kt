package com.campusar.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Space
import android.widget.TextView
import com.campusar.app.data.AuthRepository

class LoginActivity : Activity() {

    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var statusText: TextView
    private lateinit var visitorButton: Button
    private lateinit var loginButton: Button
    private lateinit var authRepo: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        authRepo = AuthRepository(this)
        setContentView(buildContentView())
    }

    private fun buildContentView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(COLOR_GRAPHITE)
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(64), dp(24), dp(24))
        }

        // Title lockup
        val title = TextView(this).apply {
            text = "CampusAR"
            textSize = 34f
            typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
            setTextColor(COLOR_TEXT_PRIMARY)
            includeFontPadding = false
            gravity = Gravity.CENTER
        }
        root.addView(title)

        val subtitle = TextView(this).apply {
            text = "oriental college of technology, bhopal"
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_AMBER)
            includeFontPadding = false
            gravity = Gravity.CENTER
            setPadding(0, dp(4), 0, 0)
        }
        root.addView(subtitle)

        root.addView(Space(this), LinearLayout.LayoutParams(0, 0, 0.35f))

        // Form panel
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(20), dp(16), dp(16))
            background = panelBackground(Color.argb(174, 12, 17, 18), COLOR_AMBER_DIM)
        }
        val panelLp = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        )

        val formHeader = TextView(this).apply {
            text = "/// ONBOARDING"
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_AMBER)
            gravity = Gravity.CENTER
            includeFontPadding = false
        }
        panel.addView(formHeader)

        nameInput = EditText(this).apply {
            hint = "Full name"
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_PRIMARY)
            setHintTextColor(COLOR_TEXT_MUTED)
            setSingleLine()
            minHeight = dp(46)
            background = inputBackground()
            backgroundTintList = null
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        panel.addView(nameInput, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(12) })

        emailInput = EditText(this).apply {
            hint = "Email (optional for visitor)"
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_PRIMARY)
            setHintTextColor(COLOR_TEXT_MUTED)
            setSingleLine()
            minHeight = dp(46)
            background = inputBackground()
            backgroundTintList = null
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        panel.addView(emailInput, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(10) })

        statusText = TextView(this).apply {
            text = "Select an option to continue."
            textSize = 13f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_SECONDARY)
            includeFontPadding = false
            gravity = Gravity.CENTER
        }
        panel.addView(statusText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(14) })

        visitorButton = Button(this).apply {
            text = "CONTINUE AS VISITOR"
            textSize = 12f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setTextColor(COLOR_GRAPHITE)
            background = buttonBackground(primary = true)
            backgroundTintList = null
            minHeight = dp(48)
            minWidth = 0
            includeFontPadding = false
            stateListAnimator = null
            setOnClickListener { onVisitorClick() }
        }
        panel.addView(visitorButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(10) })

        loginButton = Button(this).apply {
            text = "LOGIN"
            textSize = 12f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setTextColor(COLOR_TEXT_PRIMARY)
            background = buttonBackground(primary = false)
            backgroundTintList = null
            minHeight = dp(48)
            minWidth = 0
            includeFontPadding = false
            stateListAnimator = null
            setOnClickListener { onLoginClick() }
        }
        panel.addView(loginButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(8) })

        root.addView(panel, panelLp)

        root.addView(Space(this), LinearLayout.LayoutParams(0, 0, 0.45f))

        val footer = TextView(this).apply {
            text = "MAP V1 / COLLEGE NETWORK"
            textSize = 10f
            typeface = Typeface.MONOSPACE
            setTextColor(COLOR_TEXT_MUTED)
            gravity = Gravity.CENTER
            includeFontPadding = false
        }
        root.addView(footer)

        return root
    }

    private fun onVisitorClick() {
        val fullName = nameInput.text.toString().trim()
        if (fullName.isBlank()) {
            statusText.text = "Name is required."
            return
        }

        setButtonsEnabled(false)
        statusText.text = "Registering visitor..."

        val backendUrl = getString(R.string.backend_base_url)
        if (backendUrl.isBlank()) {
            // Offline mode: proceed without network
            startMainActivity()
            return
        }

        Thread {
            val email = emailInput.text.toString().trim().takeIf { it.isNotBlank() }
            val result = authRepo.registerVisitor(fullName, email, backendUrl)
            runOnUiThread {
                setButtonsEnabled(true)
                if (result != null) {
                    statusText.text = "Welcome, ${result.userId.take(8)}."
                    startMainActivity()
                } else {
                    statusText.text = "Registration failed. Check backend URL or try offline."
                }
            }
        }.start()
    }

    private fun onLoginClick() {
        val email = emailInput.text.toString().trim()
        if (email.isBlank()) {
            statusText.text = "Email is required to log in."
            return
        }

        setButtonsEnabled(false)
        statusText.text = "Logging in..."

        val backendUrl = getString(R.string.backend_base_url)
        if (backendUrl.isBlank()) {
            statusText.text = "Backend not configured. Use visitor mode."
            setButtonsEnabled(true)
            return
        }

        Thread {
            val result = authRepo.login(email, backendUrl)
            runOnUiThread {
                setButtonsEnabled(true)
                if (result != null) {
                    statusText.text = "Logged in as ${result.userId.take(8)}."
                    startMainActivity()
                } else {
                    statusText.text = "Login failed. Check email or backend."
                }
            }
        }.start()
    }

    private fun startMainActivity() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun setButtonsEnabled(enabled: Boolean) {
        visitorButton.isEnabled = enabled
        loginButton.isEnabled = enabled
        visitorButton.alpha = if (enabled) 1f else 0.42f
        loginButton.alpha = if (enabled) 1f else 0.42f
    }

    private fun panelBackground(fillColor: Int, strokeColor: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(8).toFloat()
            setColor(fillColor)
            setStroke(dp(1), strokeColor)
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

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

    private companion object {
        val COLOR_GRAPHITE: Int = Color.rgb(7, 10, 11)
        val COLOR_TEXT_PRIMARY: Int = Color.rgb(247, 243, 232)
        val COLOR_TEXT_SECONDARY: Int = Color.rgb(186, 195, 190)
        val COLOR_TEXT_MUTED: Int = Color.rgb(115, 127, 124)
        val COLOR_AMBER: Int = Color.rgb(238, 154, 78)
        val COLOR_AMBER_DIM: Int = Color.rgb(102, 67, 42)
        val COLOR_STROKE: Int = Color.rgb(55, 64, 61)
    }
}
