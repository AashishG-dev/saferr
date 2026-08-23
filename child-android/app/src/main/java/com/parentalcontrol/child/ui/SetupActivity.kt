package com.parentalcontrol.child.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.parentalcontrol.child.R
import com.parentalcontrol.child.receiver.AdminReceiver
import com.parentalcontrol.child.services.ForegroundSafetyService

class SetupActivity : AppCompatActivity() {

    private lateinit var etBackendUrl: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var btnEnableAdmin: Button
    private lateinit var btnGrantUsage: Button
    private lateinit var btnGrantOverlay: Button
    private lateinit var btnEnableAccessibility: Button
    private lateinit var btnCompleteSetup: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        etBackendUrl = findViewById(R.id.etBackendUrl)
        etPairingCode = findViewById(R.id.etPairingCode)
        btnEnableAdmin = findViewById(R.id.btnEnableAdmin)
        btnGrantUsage = findViewById(R.id.btnGrantUsage)
        btnGrantOverlay = findViewById(R.id.btnGrantOverlay)
        btnEnableAccessibility = findViewById(R.id.btnEnableAccessibility)
        btnCompleteSetup = findViewById(R.id.btnCompleteSetup)

        // Prepopulate current configuration for fast testing
        val prefs = getSharedPreferences("parental_prefs", Context.MODE_PRIVATE)
        etBackendUrl.setText(prefs.getString("backend_url", "https://api.yourdomain.com"))
        etPairingCode.setText(prefs.getString("pairing_code", ""))

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(
                arrayOf(
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION,
                    android.Manifest.permission.CAMERA,
                    android.Manifest.permission.RECORD_AUDIO
                ),
                101
            )
        }

        btnEnableAdmin.setOnClickListener { requestDeviceAdmin() }
        btnGrantUsage.setOnClickListener { requestUsageAccess() }
        btnGrantOverlay.setOnClickListener { requestOverlayPermission() }
        btnEnableAccessibility.setOnClickListener { requestAccessibilityPermission() }

        btnCompleteSetup.setOnClickListener {
            val backendUrl = etBackendUrl.text.toString().trim()
            val code = etPairingCode.text.toString().trim()

            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter pairing code from Parent Dashboard", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val p = getSharedPreferences("parental_prefs", Context.MODE_PRIVATE)
            p.edit()
                .putString("backend_url", backendUrl.ifEmpty { "http://10.0.2.2:4000" })
                .putString("pairing_code", code)
                .putString("device_id", "child-$code")
                .putBoolean("is_configured", true)
                .apply()

            ForegroundSafetyService.start(this)

            startActivity(Intent(this, StatusActivity::class.java))
            finish()
        }
    }

    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(this, "Enable 'Child Safe Shield' in Accessibility", Toast.LENGTH_LONG).show()
    }

    private fun requestDeviceAdmin() {
        val componentName = ComponentName(this, AdminReceiver::class.java)
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componentName)
            putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, getString(R.string.device_admin_description))
        }
        startActivity(intent)
    }

    private fun requestUsageAccess() {
        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        }
    }
}
