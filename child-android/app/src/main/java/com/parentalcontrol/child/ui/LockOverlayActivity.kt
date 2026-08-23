package com.parentalcontrol.child.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import com.parentalcontrol.child.R

class LockOverlayActivity : Activity() {

    companion object {
        var currentInstance: LockOverlayActivity? = null

        fun show(context: Context, reason: String = "Device locked by parent.") {
            val intent = Intent(context, LockOverlayActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("lock_reason", reason)
            }
            context.startActivity(intent)
        }

        fun dismiss(context: Context) {
            currentInstance?.finish()
            currentInstance = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentInstance = this
        setContentView(R.layout.activity_lock_overlay)

        val tvReason = findViewById<TextView>(R.id.tvLockReason)
        val reason = intent.getStringExtra("lock_reason") ?: "Device screen time limit reached."
        tvReason.text = reason
    }

    override fun onDestroy() {
        super.onDestroy()
        if (currentInstance == this) {
            currentInstance = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back press from dismissing the lockout screen
    }
}
