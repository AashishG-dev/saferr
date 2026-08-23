import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mic,
  Monitor,
  Radio,
  Image as ImageIcon,
  Play,
  Square,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { RemoteScreenshot } from '../types';

interface LiveMonitorViewProps {
  deviceId: string;
  socket: Socket;
  screenshots: RemoteScreenshot[];
  onRequestScreenshot: () => void;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  deviceId,
  socket,
  screenshots,
  onRequestScreenshot
}) => {
  const [activeMediaType, setActiveMediaType] = useState<'screen' | 'camera_front' | 'camera_back' | 'mic' | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<RemoteScreenshot | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>('Ready');
  const [latestLiveFrame, setLatestLiveFrame] = useState<string | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // WebRTC Setup
  const startWebRtcStream = (mediaType: 'screen' | 'camera_front' | 'camera_back' | 'mic') => {
    setActiveMediaType(mediaType);
    setIsStreaming(true);
    setStreamStatus(`Connecting Live ${mediaType} stream...`);

    // Send Stream Request Command to Backend / Child
    socket.emit('webrtc:request_stream', {
      deviceId,
      mediaType
    });

    // Setup WebRTC peer connection for AV
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice_candidate', {
          deviceId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC Parent] Received remote stream track:', event.track.kind);
      setStreamStatus('Live Stream Connected 🟢');
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(console.error);
      } else if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
      }
    };

    peerConnectionRef.current = pc;
  };

  const stopWebRtcStream = () => {
    setIsStreaming(false);
    setActiveMediaType(null);
    setLatestLiveFrame(null);
    setStreamStatus('Stopped');
    socket.emit('webrtc:stop_stream', { deviceId });

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Listen for high-speed live screen frame mirror from child
    const handleScreenFrame = (data: { deviceId: string; frame: string }) => {
      setLatestLiveFrame(data.frame);
      setStreamStatus('Live Screen Connected 🟢 (Real-time)');
    };

    // Listen for WebRTC Offer from Child
    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; mediaType: string }) => {
      console.log('[WebRTC Parent] Received SDP Offer from child:', data);
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          deviceId,
          sdp: answer
        });
      } catch (err) {
        console.error('Error handling SDP offer:', err);
      }
    };

    // Listen for ICE Candidate from Child
    const handleCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !data.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    socket.on('parent:screen_frame', handleScreenFrame);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:ice_candidate', handleCandidate);

    return () => {
      socket.off('parent:screen_frame', handleScreenFrame);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:ice_candidate', handleCandidate);
    };
  }, [socket, deviceId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-400" />
            Live Remote Monitoring &amp; Safety Stream
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time WebRTC audio/video streaming &amp; on-demand remote screenshots.
          </p>
        </div>

        {/* Remote Screenshot Button */}
        <button
          onClick={onRequestScreenshot}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Capture Remote Screenshot
        </button>
      </div>

      {/* Main Monitoring Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live WebRTC Stream Viewer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
              <h3 className="text-sm font-bold text-white">Live Stream Console</h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {streamStatus}
            </span>
          </div>

          {/* Video Player Box */}
          <div className="relative aspect-video bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden flex items-center justify-center">
            {isStreaming ? (
              latestLiveFrame ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={latestLiveFrame}
                    alt="Live Screen Stream"
                    className="w-full h-full object-contain select-none"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE STREAM ACTIVE
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-rose-400">Connecting Live Stream...</p>
                  <p className="text-xs text-slate-500">Awaiting direct video frame stream from device</p>
                </div>
              )
            ) : (
              <div className="text-center p-6 space-y-2">
                <Radio className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">Stream Inactive</p>
                <p className="text-xs text-slate-600 max-w-sm">
                  Select a live feed below (Camera, Screen Share, or Microphone) to establish secure WebRTC peer connection.
                </p>
              </div>
            )}

            {/* Hidden audio element for audio-only mic stream */}
            <audio ref={remoteAudioRef} autoPlay muted={isMuted} />

            {/* On-video Control Bar */}
            {isStreaming && (
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-white uppercase text-[11px] tracking-wider">
                  {activeMediaType?.replace('_', ' ')}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                  <button
                    onClick={stopWebRtcStream}
                    className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop Stream
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stream Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { id: 'screen', label: 'Screen Share', icon: Monitor },
              { id: 'camera_front', label: 'Front Camera', icon: Camera },
              { id: 'camera_back', label: 'Rear Camera', icon: Camera },
              { id: 'mic', label: 'Live Audio', icon: Mic }
            ].map((stream) => {
              const Icon = stream.icon;
              const isSelected = activeMediaType === stream.id && isStreaming;
              return (
                <button
                  key={stream.id}
                  onClick={() => (isSelected ? stopWebRtcStream() : startWebRtcStream(stream.id as any))}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {stream.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Remote Screenshots Gallery */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Screenshot Gallery
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {screenshots.length} Captured
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
            {screenshots.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs italic">
                No screenshots captured yet. Click "Capture Remote Screenshot" above.
              </div>
            ) : (
              screenshots.map((shot) => (
                <div
                  key={shot.id}
                  onClick={() => setSelectedScreenshot(shot)}
                  className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all"
                >
                  <div className="aspect-[16/9] w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    <img
                      src={shot.imageUrl}
                      alt="Remote Screenshot"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2.5 bg-slate-900/90 flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-mono">{new Date(shot.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                      {shot.triggeredBy}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Screenshot Fullscreen Modal */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Screenshot Detail</span>
              <span className="text-slate-400">{new Date(selectedScreenshot.timestamp).toLocaleString()}</span>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={selectedScreenshot.imageUrl}
                alt="Full Screenshot"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
