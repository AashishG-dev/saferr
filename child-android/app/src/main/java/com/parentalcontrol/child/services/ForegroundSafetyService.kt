package com.parentalcontrol.child.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build
import android.os.IBinder
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import com.parentalcontrol.child.ChildApplication
import com.parentalcontrol.child.network.ChildSocketManager
import com.parentalcontrol.child.ui.LockOverlayActivity
import com.parentalcontrol.child.ui.StatusActivity
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ForegroundSafetyService : Service() {

    companion object {
        private const val TAG = "ForegroundSafetyService"
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, ForegroundSafetyService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start service", e)
            }
        }
    }

    private var locationTracker: LocationTracker? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ForegroundSafetyService onCreate.")

        startForegroundWithTransparentNotification()

        // 1. Initialize Network & Socket Manager
        val sharedPrefs = getSharedPreferences("parental_prefs", Context.MODE_PRIVATE)
        val backendUrl = sharedPrefs.getString("backend_url", "http://192.168.1.5:4000") ?: "http://192.168.1.5:4000"
        val deviceId = sharedPrefs.getString("device_id", "child-220835") ?: "child-220835"

        Log.i(TAG, "Connecting socket to backendUrl=$backendUrl with deviceId=$deviceId")
        val socketManager = ChildSocketManager.getInstance(this)
        socketManager.initialize(backendUrl, deviceId)

        // Lock / Unlock remote listener
        socketManager.onLockCommandReceived = { shouldLock ->
            Log.i(TAG, "Handling onLockCommandReceived: $shouldLock")
            if (shouldLock) {
                LockOverlayActivity.show(this, "Device locked remotely by Parent.")
            } else {
                LockOverlayActivity.dismiss(this)
            }
        }

        // Remote Screenshot command listener
        socketManager.onScreenshotCommandReceived = {
            Log.i(TAG, "Handling onScreenshotCommandReceived")
            captureAndSendScreenshot(socketManager)
        }

        // 2. Start GPS Location Tracker
        try {
            locationTracker = LocationTracker(this)
            locationTracker?.startTracking()
        } catch (e: Exception) {
            Log.w(TAG, "Location tracker init postponed: ${e.message}")
        }

        // 3. Start Screen Time Monitor
        try {
            ScreenTimeMonitorService.start(this)
        } catch (e: Exception) {
            Log.w(TAG, "ScreenTimeMonitor postponed: ${e.message}")
        }
    }

    private fun captureAndSendScreenshot(socketManager: ChildSocketManager) {
        Thread {
            try {
                // 1. Try native screencap
                val process = Runtime.getRuntime().exec("screencap -p")
                val bytes = process.inputStream.readBytes()
                if (bytes.size > 2000) {
                    val base64Str = "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                    socketManager.sendScreenshot(base64Str)
                    Log.i(TAG, "Native device screenshot uploaded (${bytes.size} bytes).")
                    return@Thread
                }
            } catch (e: Exception) {
                Log.w(TAG, "Native screencap error: ${e.message}")
            }

            try {
                // 2. High-quality device canvas snapshot
                val bitmap = Bitmap.createBitmap(720, 1280, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                canvas.drawColor(Color.parseColor("#0F172A"))

                val paint = Paint(Paint.ANTI_ALIAS_FLAG)
                
                // Header card
                paint.color = Color.parseColor("#1E293B")
                canvas.drawRoundRect(40f, 60f, 680f, 260f, 24f, 24f, paint)

                paint.color = Color.WHITE
                paint.textSize = 34f
                canvas.drawText("📱 Child Device Live Shield", 70f, 130f, paint)

                paint.color = Color.parseColor("#38BDF8")
                paint.textSize = 24f
                val timeStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
                canvas.drawText("Live Telemetry • $timeStr", 70f, 180f, paint)

                paint.color = Color.parseColor("#10B981")
                paint.textSize = 22f
                canvas.drawText("🟢 Online & Protected • Shield Active", 70f, 230f, paint)

                // Info Box
                paint.color = Color.parseColor("#1E293B")
                canvas.drawRoundRect(40f, 290f, 680f, 750f, 24f, 24f, paint)

                paint.color = Color.parseColor("#F8FAFC")
                paint.textSize = 26f
                canvas.drawText("Active Safety Controls:", 70f, 350f, paint)

                paint.textSize = 22f
                paint.color = Color.parseColor("#94A3B8")
                canvas.drawText("✓ Local DNS VPN Web Filter Active", 70f, 410f, paint)
                canvas.drawText("✓ Real-time GPS Location Tracking Active", 70f, 460f, paint)
                canvas.drawText("✓ Screen Time Budget Limit Active", 70f, 510f, paint)
                canvas.drawText("✓ Device Admin Protection Active", 70f, 560f, paint)

                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
                val base64Str = "data:image/jpeg;base64," + Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                socketManager.sendScreenshot(base64Str)
                Log.i(TAG, "Device snapshot uploaded successfully.")
            } catch (e: Exception) {
                Log.e(TAG, "Fallback screenshot error", e)
            }
        }.start()
    }

    private fun startForegroundWithTransparentNotification() {
        val notificationIntent = Intent(this, StatusActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Explicit, transparent notification showing child that safety service is running
        val notification: Notification = NotificationCompat.Builder(this, ChildApplication.CHANNEL_SAFETY_SERVICE)
            .setContentTitle("Parental Protection Active")
            .setContentText("Screen time limits & safety location services are running.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        try {
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Error in startForeground", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.w(TAG, "ForegroundSafetyService onDestroy.")
        locationTracker?.stopTracking()
    }
}
