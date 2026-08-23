package com.parentalcontrol.child.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.parentalcontrol.child.services.ForegroundSafetyService
import com.parentalcontrol.child.services.ScreenTimeMonitorService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.i("BootReceiver", "Device rebooted / App updated. Restarting Safety Services...")
            ForegroundSafetyService.start(context)
            ScreenTimeMonitorService.start(context)
        }
    }
}
