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

    private val projectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            ScreenCaptureManager.init(applicationContext, result.resultCode, result.data!!)
            Toast.makeText(this, "Live Screen Shield Active 🟢", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_status)

        val tvStatus = findViewById<TextView>(R.id.tvStatus)
        val tvDeviceInfo = findViewById<TextView>(R.id.tvDeviceInfo)
        val btnSos = findViewById<Button>(R.id.btnSos)
        val btnEnableScreenCapture = findViewById<Button>(R.id.btnEnableScreenCapture)

        val prefs = getSharedPreferences("parental_prefs", Context.MODE_PRIVATE)
        val deviceId = prefs.getString("device_id", "child-demo-01")

        tvDeviceInfo.text = "Device ID: $deviceId\nProtected by Family Shield"
        tvStatus.text = "🛡️ Protection Active\nLocation, Screen Time & Safe Web enabled"

        btnEnableScreenCapture.setOnClickListener {
            val mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            projectionLauncher.launch(mediaProjectionManager.createScreenCaptureIntent())
        }

        btnSos.setOnClickListener {
            ChildSocketManager.getInstance(this).sendAlert(
                "GEOFENCE_EXIT",
                "🚨 SOS Emergency button triggered by child!",
                "high"
            )
            Toast.makeText(this, "SOS Emergency alert sent to parents!", Toast.LENGTH_LONG).show()
        }

        // Request Screen Capture permission if not already active
        if (!ScreenCaptureManager.isReady()) {
            val mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            projectionLauncher.launch(mediaProjectionManager.createScreenCaptureIntent())
        }
    }
}
