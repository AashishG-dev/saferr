package com.parentalcontrol.child.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class CamouflageActivity : Activity() {

    private var secretTapCount = 0
    private var lastTapTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Clean native system utility UI
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(60, 100, 60, 60)
            setBackgroundColor(android.graphics.Color.parseColor("#121824"))
        }

        val tvIcon = TextView(this).apply {
            text = "⚙️"
            textSize = 48f
            setPadding(0, 40, 0, 20)
        }

        val tvTitle = TextView(this).apply {
            text = "System Services"
            setTextColor(android.graphics.Color.WHITE)
            textSize = 22f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }

        val tvSubtitle = TextView(this).apply {
            text = "All background sync and security services are running normally."
            setTextColor(android.graphics.Color.parseColor("#94A3B8"))
            textSize = 14f
            setPadding(0, 16, 0, 40)
        }

        val tvVersion = TextView(this).apply {
            text = "Service Version 14.2.1 • Security Patch 2026\n(Tap to refresh status)"
            setTextColor(android.graphics.Color.parseColor("#64748B"))
            textSize = 12f
            setPadding(0, 60, 0, 0)
        }

        // Secret 5-tap gesture to open Parental Controls
        tvVersion.setOnClickListener {
            val now = System.currentTimeMillis()
            if (now - lastTapTime < 1000) {
                secretTapCount++
                if (secretTapCount >= 5) {
                    secretTapCount = 0
                    startActivity(Intent(this@CamouflageActivity, StatusActivity::class.java))
                    finish()
                } else if (secretTapCount >= 2) {
                    Toast.makeText(this@CamouflageActivity, "Tap ${5 - secretTapCount} more times for Parent Menu", Toast.LENGTH_SHORT).show()
                }
            } else {
                secretTapCount = 1
                Toast.makeText(this@CamouflageActivity, "System status: Optimal 🟢", Toast.LENGTH_SHORT).show()
            }
            lastTapTime = now
        }

        layout.addView(tvIcon)
        layout.addView(tvTitle)
        layout.addView(tvSubtitle)
        layout.addView(tvVersion)

        setContentView(layout)
    }
}
