package com.parentalcontrol.child.services

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.*
import com.parentalcontrol.child.network.ChildSocketManager
import java.util.Locale

class LocationTracker(private val context: Context) {

    companion object {
        private const val TAG = "LocationTracker"
        private const val UPDATE_INTERVAL_MS = 20000L // 20 seconds
        private const val FASTEST_INTERVAL_MS = 10000L
    }

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            val lat = location.latitude
            val lng = location.longitude
            val accuracy = location.accuracy

            Log.d(TAG, "Location updated: Lat=$lat, Lng=$lng, Acc=$accuracy")

            // Reverse geocode in background thread
            var addressText: String? = null
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val addresses = geocoder.getFromLocation(lat, lng, 1)
                if (!addresses.isNullOrEmpty()) {
                    val addr = addresses[0]
                    addressText = "${addr.thoroughfare ?: ""}, ${addr.locality ?: ""}".trim(',', ' ')
                }
            } catch (e: Exception) {
                Log.w(TAG, "Geocoding error: ${e.message}")
            }

            ChildSocketManager.getInstance(context).sendLocation(lat, lng, accuracy, addressText)
        }
    }

    @SuppressLint("MissingPermission")
    fun startTracking() {
        try {
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
                .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
                .setMinUpdateDistanceMeters(5f)
                .build()

            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            Log.i(TAG, "Location tracking started.")
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing location permissions", e)
        }
    }

    fun stopTracking() {
        fusedClient.removeLocationUpdates(locationCallback)
    }
}
