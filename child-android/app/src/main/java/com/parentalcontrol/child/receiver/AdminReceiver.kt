package com.parentalcontrol.child.receiver

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import com.parentalcontrol.child.services.ForegroundSafetyService

class AdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "AdminReceiver"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Admin enabled successfully.")
        Toast.makeText(context, "Parental Control Admin Enabled", Toast.LENGTH_SHORT).show()
        ForegroundSafetyService.start(context)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Device Admin disabled.")
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)
        Log.i(TAG, "Device Owner provisioning complete.")
    }
}
