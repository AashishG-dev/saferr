package com.parentalcontrol.child.ui

import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.parentalcontrol.child.R
import com.parentalcontrol.child.network.ChildSocketManager
import com.parentalcontrol.child.services.ScreenCaptureManager

class StatusActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_status)

        val tvStatus = findViewById<TextView>(R.id.tvStatus)
        val tvDeviceInfo = findViewById<TextView>(R.id.tvDeviceInfo)
        val btnSos = findViewById<Button>(R.id.btnSos)

        val prefs = getSharedPreferences("parental_prefs", Context.MODE_PRIVATE)
        val deviceId = prefs.getString("device_id", "child-demo-01")

        // Ensure Foreground Safety Service is running
        com.parentalcontrol.child.services.ForegroundSafetyService.start(this)

        tvDeviceInfo.text = "Device ID: $deviceId\nProtected by Family Shield"
        tvStatus.text = "🛡️ Protection Active\nLocation, Screen Time & Safe Web enabled"

        btnSos.setOnClickListener {
            ChildSocketManager.getInstance(this).sendAlert(
                "GEOFENCE_EXIT",
                "🚨 SOS Emergency button triggered by child!",
                "high"
            )
            Toast.makeText(this, "SOS Emergency alert sent to parents!", Toast.LENGTH_LONG).show()
        }
    }
}
