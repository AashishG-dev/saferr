package com.parentalcontrol.child

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class ChildApplication : Application() {

    companion object {
        const val CHANNEL_SAFETY_SERVICE = "channel_safety_service"
        const val CHANNEL_ALERTS = "channel_safety_alerts"
        lateinit var instance: ChildApplication
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val safetyChannel = NotificationChannel(
                CHANNEL_SAFETY_SERVICE,
                "Child Safety Protection Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows transparent active safety and parental control background service."
                setShowBadge(false)
            }

            val alertsChannel = NotificationChannel(
                CHANNEL_ALERTS,
                "Parental Control Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical alerts regarding screen time and safety policies."
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(safetyChannel)
            manager.createNotificationChannel(alertsChannel)
        }
    }
}
