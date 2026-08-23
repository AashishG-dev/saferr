package com.parentalcontrol.child.services

import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.parentalcontrol.child.network.ChildSocketManager
import com.parentalcontrol.child.ui.LockOverlayActivity
import java.text.SimpleDateFormat
import java.util.*

class ScreenTimeMonitorService : Service() {

    companion object {
        private const val TAG = "ScreenTimeMonitor"
        private const val POLL_INTERVAL_MS = 5000L

        fun start(context: Context) {
            val intent = Intent(context, ScreenTimeMonitorService::class.java)
            context.startService(intent)
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var dailyLimitMinutes = 120
    private var blockedApps = mutableSetOf<String>()
    private var isManuallyLocked = false

    private val monitorRunnable = object : Runnable {
        override fun run() {
            checkCurrentAppAndLimits()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ScreenTimeMonitorService started.")

        // Listen for policy sync
        ChildSocketManager.getInstance(this).onPolicyUpdated = { json ->
            val screenTime = json.optJSONObject("screenTime")
            if (screenTime != null) {
                dailyLimitMinutes = screenTime.optInt("dailyLimitMinutes", 120)
                isManuallyLocked = screenTime.optBoolean("isLocked", false)

                val blockedArray = screenTime.optJSONArray("blockedApps")
                blockedApps.clear()
                if (blockedArray != null) {
                    for (i in 0 until blockedArray.length()) {
                        blockedApps.add(blockedArray.getString(i))
                    }
                }
            }
        }

        // Listen for manual lock command
        ChildSocketManager.getInstance(this).onLockCommandReceived = { locked ->
            isManuallyLocked = locked
            if (locked) {
                triggerLockOverlay("Device locked remotely by parent.")
            }
        }

        handler.post(monitorRunnable)
    }

    private fun checkCurrentAppAndLimits() {
        if (isManuallyLocked) {
            triggerLockOverlay("Device locked by parent.")
            return
        }

        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return
        val time = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(time - 10000, time)
        val event = UsageEvents.Event()

        var currentForegroundPackage: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                currentForegroundPackage = event.packageName
            }
        }

        currentForegroundPackage?.let { pkg ->
            if (blockedApps.contains(pkg)) {
                triggerLockOverlay("This app is restricted by parental controls.")
            }
        }
    }

    private fun triggerLockOverlay(reason: String) {
        val intent = Intent(this, LockOverlayActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("lock_reason", reason)
        }
        startActivity(intent)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(monitorRunnable)
    }
}
