package com.parentalcontrol.child.utils

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

object StealthManager {
    private const val TAG = "StealthManager"
    private const val ALIAS_NAME = "com.parentalcontrol.child.LauncherAlias"

    fun isAppHidden(context: Context): Boolean {
        return try {
            val componentName = ComponentName(context, ALIAS_NAME)
            val state = context.packageManager.getComponentEnabledSetting(componentName)
            state == PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        } catch (e: Exception) {
            false
        }
    }

    fun setAppHidden(context: Context, hide: Boolean) {
        try {
            val pm = context.packageManager
            val newState = if (hide) {
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER
            } else {
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            }

            // 1. Toggle Launcher Alias
            pm.setComponentEnabledSetting(
                ComponentName(context, ALIAS_NAME),
                newState,
                PackageManager.DONT_KILL_APP
            )

            // 2. Toggle SetupActivity
            pm.setComponentEnabledSetting(
                ComponentName(context, com.parentalcontrol.child.ui.SetupActivity::class.java),
                newState,
                PackageManager.DONT_KILL_APP
            )

            Log.i(TAG, "App icon visibility updated: hide=$hide with state=$newState")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating app icon visibility: ${e.message}", e)
        }
    }
}
