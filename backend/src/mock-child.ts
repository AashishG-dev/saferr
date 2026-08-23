import { io } from 'socket.io-client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const DEVICE_ID = process.env.DEVICE_ID || 'child-demo-01';

console.log(`🤖 Starting Mock Child Device [${DEVICE_ID}] connecting to ${BACKEND_URL}...`);

const socket = io(BACKEND_URL, {
  query: {
    type: 'child',
    deviceId: DEVICE_ID
  }
});

let battery = 85;
let lat = 37.7749;
let lng = -122.4194;

socket.on('connect', () => {
  console.log(`✅ [Mock Child] Connected to Backend Server (Socket ID: ${socket.id})`);

  // Periodic Telemetry & Health
  setInterval(() => {
    battery = Math.max(15, battery - 1);
    socket.emit('child:telemetry', {
      deviceId: DEVICE_ID,
      batteryLevel: battery,
      isCharging: battery < 20,
      activeApp: ['YouTube', 'Instagram', 'Roblox', 'Chrome', 'WhatsApp'][Math.floor(Math.random() * 5)]
    });
  }, 10000);

  // Periodic Location Updates (simulating child walking)
  setInterval(() => {
    lat += (Math.random() - 0.5) * 0.001;
    lng += (Math.random() - 0.5) * 0.001;
    socket.emit('child:location', {
      deviceId: DEVICE_ID,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracy: 6.5,
      address: 'Market St & 4th St, San Francisco, CA'
    });
  }, 15000);
});

// Respond to Parent Lock command
socket.on('child:command:lock', (data: { lock: boolean }) => {
  console.log(`🔒 [Child Event] Received Lock command: isLocked = ${data.lock}`);
});

// Respond to Parent Screenshot request
socket.on('child:command:take_screenshot', () => {
  console.log(`📸 [Child Event] Received Take Screenshot request! Generating sample snapshot...`);
  // Generate a mock base64 SVG/PNG screen capture
  const mockImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700" viewBox="0 0 400 700">
    <rect width="400" height="700" fill="%231e293b"/>
    <rect x="20" y="40" width="360" height="50" rx="10" fill="%23334155"/>
    <text x="40" y="72" fill="%2394a3b8" font-family="sans-serif" font-size="16">Search or type URL...</text>
    <rect x="20" y="110" width="360" height="200" rx="12" fill="%230f172a"/>
    <text x="40" y="160" fill="%2338bdf8" font-family="sans-serif" font-size="20" font-weight="bold">YouTube Shorts</text>
    <text x="40" y="190" fill="%23ffffff" font-family="sans-serif" font-size="14">Playing: Science Experiment 101</text>
    <rect x="20" y="330" width="170" height="150" rx="10" fill="%23334155"/>
    <text x="35" y="370" fill="%23f43f5e" font-family="sans-serif" font-size="16" font-weight="bold">Roblox</text>
    <rect x="210" y="330" width="170" height="150" rx="10" fill="%23334155"/>
    <text x="225" y="370" fill="%2310b981" font-family="sans-serif" font-size="16" font-weight="bold">WhatsApp</text>
    <text x="20" y="660" fill="%2364748b" font-family="sans-serif" font-size="12">Simulated Child Android Screen • ${new Date().toLocaleTimeString()}</text>
  </svg>`;

  socket.emit('child:screenshot_upload', {
    deviceId: DEVICE_ID,
    imageBase64: mockImage,
    triggeredBy: 'manual'
  });
});

// Respond to Policy Sync
socket.on('child:policy_sync', (policy: any) => {
  console.log(`📋 [Child Event] Policies synchronized:`, policy);
});

// WebRTC Stream request from Parent
socket.on('child:webrtc:start_stream', (data: { parentSocketId: string; mediaType: string }) => {
  console.log(`📹 [Child Event] Parent requested WebRTC Stream: ${data.mediaType}`);
  // In native Android, WebRtcManager starts video capturer (Screen / Camera / Mic) and produces SDP Offer
});

socket.on('disconnect', () => {
  console.log('❌ [Mock Child] Disconnected');
});
