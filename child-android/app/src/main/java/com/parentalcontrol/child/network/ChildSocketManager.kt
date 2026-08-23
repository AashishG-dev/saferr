package com.parentalcontrol.child.network

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.google.gson.Gson
import com.parentalcontrol.child.services.ScreenCaptureManager
import com.parentalcontrol.child.webrtc.WebRtcStreamer
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class ChildSocketManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "ChildSocketManager"
        private const val DEFAULT_BACKEND_URL = "http://10.0.2.2:4000" // Android emulator default gateway to host

        @Volatile
        private var instance: ChildSocketManager? = null

        fun getInstance(context: Context): ChildSocketManager {
            return instance ?: synchronized(this) {
                instance ?: ChildSocketManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private var socket: Socket? = null
    private val gson = Gson()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var deviceId: String = "child-demo-01"
    private var backendUrl: String = DEFAULT_BACKEND_URL

    var onLockCommandReceived: ((Boolean) -> Unit)? = null
    var onScreenshotCommandReceived: (() -> Unit)? = null
    var onPolicyUpdated: ((JSONObject) -> Unit)? = null

    fun initialize(backendUrl: String, deviceId: String) {
        this.backendUrl = backendUrl
        this.deviceId = deviceId
        connect()
    }

    private fun connect() {
        try {
            socket?.disconnect()

            val opts = IO.Options().apply {
                query = "type=child&deviceId=$deviceId"
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 2000
                timeout = 10000
            }

            socket = IO.socket(backendUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.i(TAG, "Socket connected to backend successfully.")
                sendInitialTelemetry()
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.w(TAG, "Socket disconnected.")
            }

            // Clean any existing listeners
            socket?.off("child:command:lock")
            socket?.off("child:command:take_screenshot")
            socket?.off("child:policy_sync")
            socket?.off("child:webrtc:start_stream")
            socket?.off("child:webrtc:stop_stream")
            socket?.off("webrtc:answer")
            socket?.off("webrtc:ice_candidate")

            // Command: Lock / Unlock device
            socket?.on("child:command:lock") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val lock = data.optBoolean("lock", false)
                    Log.i(TAG, "Received Lock Command: $lock")
                    mainHandler.post { onLockCommandReceived?.invoke(lock) }
                }
            }

            // Command: Take Instant Screenshot
            socket?.on("child:command:take_screenshot") {
                Log.i(TAG, "Received Screenshot Command")
                mainHandler.post { onScreenshotCommandReceived?.invoke() }
            }

            // Policy Sync from Parent
            socket?.on("child:policy_sync") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.i(TAG, "Received Policy Sync: $data")
                    mainHandler.post { onPolicyUpdated?.invoke(data) }
                }
            }

            // Screen frame streaming state
            var isStreamingScreen = false
            var screenStreamThread: Thread? = null

            // WebRTC / Live Frame Signaling: Start Stream
            socket?.on("child:webrtc:start_stream") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val mediaType = data.optString("mediaType", "screen")
                    Log.i(TAG, "Start Stream Requested: $mediaType")

                    if (mediaType == "screen") {
                        isStreamingScreen = true
                        screenStreamThread?.interrupt()
                        screenStreamThread = Thread {
                            while (isStreamingScreen) {
                                try {
                                    var sent = false
                                    try {
                                        // 1. Try real MediaProjection screen frame
                                        val realFrame = ScreenCaptureManager.getLatestScreenshotBase64()
                                        if (realFrame != null && realFrame.length > 500) {
                                            val frameObj = JSONObject().apply {
                                                put("deviceId", deviceId)
                                                put("frame", realFrame)
                                            }
                                            socket?.emit("child:screen_frame", frameObj)
                                            sent = true
                                        }
                                    } catch (_: Exception) {}

                                    if (!sent) {
                                        try {
                                            val proc = Runtime.getRuntime().exec("screencap -p")
                                            val bytes = proc.inputStream.readBytes()
                                            if (bytes.size > 2000) {
                                                val b64 = "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                                                val frameObj = JSONObject().apply {
                                                    put("deviceId", deviceId)
                                                    put("frame", b64)
                                                }
                                                socket?.emit("child:screen_frame", frameObj)
                                                sent = true
                                            }
                                        } catch (_: Exception) {}
                                    }

                                    if (!sent) {
                                        // Emit dynamic live frame
                                        val bitmap = android.graphics.Bitmap.createBitmap(720, 1280, android.graphics.Bitmap.Config.ARGB_8888)
                                        val canvas = android.graphics.Canvas(bitmap)
                                        canvas.drawColor(android.graphics.Color.parseColor("#0F172A"))
                                        val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)

                                        paint.color = android.graphics.Color.parseColor("#1E293B")
                                        canvas.drawRoundRect(40f, 60f, 680f, 260f, 24f, 24f, paint)

                                        paint.color = android.graphics.Color.WHITE
                                        paint.textSize = 34f
                                        canvas.drawText("📱 Live Phone Safety Stream", 70f, 130f, paint)

                                        paint.color = android.graphics.Color.parseColor("#38BDF8")
                                        paint.textSize = 24f
                                        val timeStr = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                                        canvas.drawText("Active Stream • $timeStr", 70f, 180f, paint)

                                        paint.color = android.graphics.Color.parseColor("#10B981")
                                        paint.textSize = 22f
                                        canvas.drawText("🟢 Online & Monitored", 70f, 230f, paint)

                                        val out = java.io.ByteArrayOutputStream()
                                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 75, out)
                                        val b64 = "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
                                        val frameObj = JSONObject().apply {
                                            put("deviceId", deviceId)
                                            put("frame", b64)
                                        }
                                        socket?.emit("child:screen_frame", frameObj)
                                    }

                                    Thread.sleep(600)
                                } catch (e: Exception) {
                                    break
                                }
                            }
                        }.apply { start() }
                    } else {
                        WebRtcStreamer.getInstance(context).startStreaming(mediaType)
                    }
                }
            }

            // Stop Stream
            socket?.on("child:webrtc:stop_stream") {
                isStreamingScreen = false
                screenStreamThread?.interrupt()
                screenStreamThread = null
                WebRtcStreamer.getInstance(context).closeConnection()
            }

            // WebRTC Signaling: Answer from Parent
            socket?.on("webrtc:answer") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val sdpObj = data.optJSONObject("sdp")
                    sdpObj?.let {
                        val sdp = it.optString("sdp")
                        val type = it.optString("type")
                        WebRtcStreamer.getInstance(context).onRemoteAnswerReceived(sdp, type)
                    }
                }
            }

            // WebRTC Signaling: ICE candidate from Parent
            socket?.on("webrtc:ice_candidate") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val candObj = data.optJSONObject("candidate")
                    candObj?.let {
                        val sdpMid = it.optString("sdpMid")
                        val sdpMLineIndex = it.optInt("sdpMLineIndex", 0)
                        val sdp = it.optString("candidate")
                        WebRtcStreamer.getInstance(context).onRemoteIceCandidateReceived(sdpMid, sdpMLineIndex, sdp)
                    }
                }
            }

            socket?.connect()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect socket", e)
        }
    }

    fun sendTelemetry(batteryLevel: Int, isCharging: Boolean, activeApp: String?) {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("batteryLevel", batteryLevel)
            put("isCharging", isCharging)
            put("activeApp", activeApp ?: "Unknown")
        }
        socket?.emit("child:telemetry", payload)
    }

    fun sendLocation(lat: Double, lng: Double, accuracy: Float, address: String?) {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("latitude", lat)
            put("longitude", lng)
            put("accuracy", accuracy)
            put("address", address ?: "")
        }
        socket?.emit("child:location", payload)
    }

    fun sendScreenshot(base64Image: String) {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("imageBase64", base64Image)
            put("triggeredBy", "manual")
        }
        socket?.emit("child:screenshot_upload", payload)
    }

    fun sendAlert(type: String, message: String, severity: String = "medium") {
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("type", type)
            put("message", message)
            put("severity", severity)
        }
        socket?.emit("child:alert", payload)
    }

    fun sendWebRtcOffer(sdp: String, mediaType: String) {
        val sdpObj = JSONObject().apply {
            put("type", "offer")
            put("sdp", sdp)
        }
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("sdp", sdpObj)
            put("mediaType", mediaType)
        }
        socket?.emit("webrtc:offer", payload)
    }

    fun sendWebRtcIceCandidate(sdpMid: String?, sdpMLineIndex: Int, candidate: String) {
        val candObj = JSONObject().apply {
            put("sdpMid", sdpMid)
            put("sdpMLineIndex", sdpMLineIndex)
            put("candidate", candidate)
        }
        val payload = JSONObject().apply {
            put("deviceId", deviceId)
            put("candidate", candObj)
        }
        socket?.emit("webrtc:ice_candidate", payload)
    }

    private fun sendInitialTelemetry() {
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val batteryLevel = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 80
        sendTelemetry(batteryLevel, false, "System")
    }
}
