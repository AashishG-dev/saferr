package com.parentalcontrol.child.webrtc

import android.content.Context
import android.util.Log
import com.parentalcontrol.child.network.ChildSocketManager
import org.webrtc.*
import java.util.concurrent.Executors

class WebRtcStreamer private constructor(private val context: Context) {

    companion object {
        private const val TAG = "WebRtcStreamer"

        @Volatile
        private var instance: WebRtcStreamer? = null

        fun getInstance(context: Context): WebRtcStreamer {
            return instance ?: synchronized(this) {
                instance ?: WebRtcStreamer(context.applicationContext).also { instance = it }
            }
        }
    }

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var videoCapturer: VideoCapturer? = null
    private var videoSource: VideoSource? = null
    private var audioSource: AudioSource? = null
    private val executor = Executors.newSingleThreadExecutor()

    init {
        initializePeerConnectionFactory()
    }

    private fun initializePeerConnectionFactory() {
        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)

        val eglBase = EglBase.create()
        val defaultVideoEncoderFactory = DefaultVideoEncoderFactory(eglBase.eglBaseContext, true, true)
        val defaultVideoDecoderFactory = DefaultVideoDecoderFactory(eglBase.eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(defaultVideoEncoderFactory)
            .setVideoDecoderFactory(defaultVideoDecoderFactory)
            .setOptions(PeerConnectionFactory.Options())
            .createPeerConnectionFactory()
    }

    fun startStreaming(mediaType: String) {
        executor.execute {
            try {
                closeConnection()

                val iceServers = listOf(
                    PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
                    PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
                )

                val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
                    sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
                    continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
                }

                peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
                    override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
                    override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                        Log.i(TAG, "ICE Connection State: $state")
                    }
                    override fun onIceConnectionReceivingChange(receiving: Boolean) {}
                    override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
                    override fun onIceCandidate(candidate: IceCandidate?) {
                        candidate?.let {
                            ChildSocketManager.getInstance(context).sendWebRtcIceCandidate(
                                it.sdpMid,
                                it.sdpMLineIndex,
                                it.sdp
                            )
                        }
                    }
                    override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
                    override fun onAddStream(stream: MediaStream?) {}
                    override fun onRemoveStream(stream: MediaStream?) {}
                    override fun onDataChannel(channel: DataChannel?) {}
                    override fun onRenegotiationNeeded() {}
                    override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {}
                })

                // Create Audio Track
                val audioConstraints = MediaConstraints()
                audioSource = peerConnectionFactory?.createAudioSource(audioConstraints)
                localAudioTrack = peerConnectionFactory?.createAudioTrack("ARDAMSa0", audioSource)
                peerConnection?.addTrack(localAudioTrack, listOf("ARDAMS"))

                // Create Video Track if camera requested
                if (mediaType.startsWith("camera")) {
                    videoCapturer = createCameraCapturer(isFront = mediaType.contains("front"))
                    if (videoCapturer != null) {
                        val surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", EglBase.create().eglBaseContext)
                        videoSource = peerConnectionFactory?.createVideoSource(videoCapturer!!.isScreencast)
                        videoCapturer?.initialize(surfaceTextureHelper, context, videoSource?.capturerObserver)
                        videoCapturer?.startCapture(640, 480, 24)
                        localVideoTrack = peerConnectionFactory?.createVideoTrack("ARDAMSv0", videoSource)
                        peerConnection?.addTrack(localVideoTrack, listOf("ARDAMS"))
                    }
                }

                // Create SDP Offer
                val sdpConstraints = MediaConstraints().apply {
                    mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "false"))
                    mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
                }

                peerConnection?.createOffer(object : SdpObserver {
                    override fun onCreateSuccess(sdp: SessionDescription?) {
                        sdp?.let {
                            peerConnection?.setLocalDescription(object : SdpObserver {
                                override fun onCreateSuccess(p0: SessionDescription?) {}
                                override fun onSetSuccess() {
                                    ChildSocketManager.getInstance(context).sendWebRtcOffer(it.description, mediaType)
                                }
                                override fun onCreateFailure(p0: String?) {}
                                override fun onSetFailure(err: String?) {
                                    Log.e(TAG, "Failed to set local SDP description: $err")
                                }
                            }, it)
                        }
                    }
                    override fun onSetSuccess() {}
                    override fun onCreateFailure(err: String?) {
                        Log.e(TAG, "Failed to create SDP offer: $err")
                    }
                    override fun onSetFailure(err: String?) {}
                }, sdpConstraints)

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start WebRTC streaming", e)
            }
        }
    }

    fun onRemoteAnswerReceived(sdpString: String, type: String) {
        executor.execute {
            val sdp = SessionDescription(SessionDescription.Type.ANSWER, sdpString)
            peerConnection?.setRemoteDescription(object : SdpObserver {
                override fun onCreateSuccess(p0: SessionDescription?) {}
                override fun onSetSuccess() {
                    Log.i(TAG, "Remote SDP answer set successfully.")
                }
                override fun onCreateFailure(p0: String?) {}
                override fun onSetFailure(err: String?) {
                    Log.e(TAG, "Failed to set remote SDP answer: $err")
                }
            }, sdp)
        }
    }

    fun onRemoteIceCandidateReceived(sdpMid: String?, sdpMLineIndex: Int, candidateSdp: String) {
        executor.execute {
            val candidate = IceCandidate(sdpMid, sdpMLineIndex, candidateSdp)
            peerConnection?.addIceCandidate(candidate)
        }
    }

    private fun createCameraCapturer(isFront: Boolean): VideoCapturer? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames

        // Find matching camera
        for (deviceName in deviceNames) {
            if (isFront && enumerator.isFrontFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
            if (!isFront && enumerator.isBackFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }
        return null
    }

    fun closeConnection() {
        try {
            videoCapturer?.stopCapture()
            videoCapturer?.dispose()
            videoCapturer = null
            videoSource?.dispose()
            audioSource?.dispose()
            peerConnection?.close()
            peerConnection = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing WebRTC connection", e)
        }
    }
}
