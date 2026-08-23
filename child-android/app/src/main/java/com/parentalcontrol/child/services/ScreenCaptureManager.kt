package com.parentalcontrol.child.services

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.util.Base64
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

object ScreenCaptureManager {
    private const val TAG = "ScreenCaptureManager"

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null

    private var screenWidth = 540
    private var screenHeight = 960
    private var screenDensity = 320
    @Volatile
    private var latestFrameBase64: String? = null

    fun init(context: Context, resultCode: Int, data: Intent) {
        try {
            val projectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = projectionManager.getMediaProjection(resultCode, data)

            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val metrics = DisplayMetrics()
            windowManager.defaultDisplay.getRealMetrics(metrics)

            // Full native HD resolution for crystal clear screenshots and text
            screenWidth = metrics.widthPixels
            screenHeight = metrics.heightPixels
            screenDensity = metrics.densityDpi

            @SuppressLint("WrongConstant")
            imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 3)

            imageReader?.setOnImageAvailableListener({ reader ->
                var img: Image? = null
                var bmp: Bitmap? = null
                try {
                    img = reader.acquireLatestImage()
                    if (img != null) {
                        val planes = img.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * screenWidth

                        bmp = Bitmap.createBitmap(
                            screenWidth + rowPadding / pixelStride,
                            screenHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        bmp.copyPixelsFromBuffer(buffer)
                        val cropped = Bitmap.createBitmap(bmp, 0, 0, screenWidth, screenHeight)
                        val out = ByteArrayOutputStream()
                        cropped.compress(Bitmap.CompressFormat.JPEG, 88, out)
                        latestFrameBase64 = "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Frame listener error: ${e.message}")
                } finally {
                    img?.close()
                    bmp?.recycle()
                }
            }, android.os.Handler(android.os.Looper.getMainLooper()))

            mediaProjection?.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    release()
                }
            }, android.os.Handler(android.os.Looper.getMainLooper()))

            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "FamilyShieldCapture",
                screenWidth,
                screenHeight,
                screenDensity,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader?.surface,
                null,
                null
            )

            Log.i(TAG, "MediaProjection VirtualDisplay initialized successfully: ${screenWidth}x${screenHeight}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize MediaProjection", e)
        }
    }

    fun isReady(): Boolean = mediaProjection != null && imageReader != null

    fun getLatestScreenshotBase64(): String? {
        if (latestFrameBase64 != null) {
            return latestFrameBase64
        }
        val reader = imageReader ?: return null
        var image: Image? = null
        var bitmap: Bitmap? = null
        try {
            image = reader.acquireLatestImage()
            if (image != null) {
                val planes = image.planes
                val buffer: ByteBuffer = planes[0].buffer
                val pixelStride = planes[0].pixelStride
                val rowStride = planes[0].rowStride
                val rowPadding = rowStride - pixelStride * screenWidth

                bitmap = Bitmap.createBitmap(
                    screenWidth + rowPadding / pixelStride,
                    screenHeight,
                    Bitmap.Config.ARGB_8888
                )
                bitmap.copyPixelsFromBuffer(buffer)
                val cropped = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
                val out = ByteArrayOutputStream()
                cropped.compress(Bitmap.CompressFormat.JPEG, 75, out)
                val b64 = "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
                latestFrameBase64 = b64
                return b64
            }
        } catch (e: Exception) {
            Log.w(TAG, "Direct grab error: ${e.message}")
        } finally {
            image?.close()
            bitmap?.recycle()
        }
        return latestFrameBase64
    }

    fun release() {
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
    }
}
