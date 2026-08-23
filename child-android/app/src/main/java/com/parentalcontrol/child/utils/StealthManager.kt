package com.parentalcontrol.child.utils

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

object StealthManager {
    private const val TAG = "StealthManager"
    private const val DEFAULT_ALIAS = "com.parentalcontrol.child.LauncherAlias"
    private const val CAMOUFLAGE_ALIAS = "com.parentalcontrol.child.CamouflageAlias"

    enum class StealthMode {
        NORMAL,
        CAMOUFLAGE,
        HIDDEN
    }

    fun setMode(context: Context, mode: StealthMode) {
        try {
            val pm = context.packageManager
            val defaultComp = ComponentName(context, DEFAULT_ALIAS)
            val camoComp = ComponentName(context, CAMOUFLAGE_ALIAS)
            val setupComp = ComponentName(context, com.parentalcontrol.child.ui.SetupActivity::class.java)

            when (mode) {
                StealthMode.NORMAL -> {
                    pm.setComponentEnabledSetting(defaultComp, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(camoComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(setupComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                    Log.i(TAG, "Switched to NORMAL mode (Child Safety Shield)")
                }
                StealthMode.CAMOUFLAGE -> {
                    pm.setComponentEnabledSetting(defaultComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(camoComp, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(setupComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                    Log.i(TAG, "Switched to CAMOUFLAGE mode (System Service)")
                }
                StealthMode.HIDDEN -> {
                    pm.setComponentEnabledSetting(defaultComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(camoComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(setupComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER, PackageManager.DONT_KILL_APP)
                    Log.i(TAG, "Switched to HIDDEN mode (Total Stealth)")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating stealth mode: ${e.message}", e)
        }
    }
}
