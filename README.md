# 🛡️ Saferr - Parental Safety & Device Monitoring Platform

Comprehensive parental control system supporting screen time enforcement, real-time GPS location tracking with geofencing, local DNS VPN content filtering, remote screenshotting, live WebRTC camera/audio safety monitoring, and easy deployment with **Cloudflare Tunnels**.

---

## 🏗️ Architecture & Modules

```
├── backend/                  # Node.js + TypeScript (Express, Socket.IO, WebRTC signaling)
│   ├── src/
│   │   ├── routes/api.ts     # REST API for devices, policies, location, alerts
│   │   ├── sockets/          # Real-time WebSocket commands & WebRTC SDP/ICE relay
│   │   ├── store/            # Data store for policies, logs & telemetry
│   │   └── mock-child.ts     # Simulator for testing child phone telemetry & WebRTC
│   ├── Dockerfile
│   └── package.json
│
├── parent-dashboard/         # React 18 + Vite + Tailwind CSS + Leaflet Maps
│   ├── src/
│   │   ├── pages/            # Overview, ScreenTime, LocationMap, WebFilter, LiveMonitor
│   │   ├── components/       # Navbar, DeviceCard, PairingModal, StreamPlayer
│   │   └── lib/api.ts        # REST & Socket.IO client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── child-android/            # Native Android (Kotlin) Child Service Client
│   └── app/src/main/
│       ├── java/com/parentalcontrol/child/
│       │   ├── services/     # ForegroundSafetyService, DnsFilterVpnService, ScreenTimeMonitorService, LocationTracker
│       │   ├── webrtc/       # WebRtcStreamer (Camera, Screen Share, Audio)
│       │   ├── receiver/     # AdminReceiver (Device Administrator / MDM), BootReceiver
│       │   ├── network/      # ChildSocketManager (Realtime commands & telemetry)
│       │   └── ui/           # SetupActivity, StatusActivity, LockOverlayActivity
│       └── AndroidManifest.xml
│
├── cloudflare/               # Cloudflare Tunnel Configuration Examples
│   └── config.yml.example
├── CLOUDFLARE_TUNNEL_GUIDE.md # Complete Cloudflare Tunnel Deployment Guide
└── docker-compose.yml        # Docker composition for hosting frontend, backend & tunnel
```

---

## 🚀 Quick Start Guide

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
* **API Endpoint**: `http://localhost:4000/api`
* **WebSocket / Signaling**: `ws://localhost:4000`

---

### 2. Start Parent Dashboard
```bash
cd parent-dashboard
npm install
npm run dev
```
Open **`http://localhost:3000`** in your web browser.

---

### 3. Quick Run with Docker Compose
```bash
docker-compose up -d --build
```

---

### 4. Deploy with Cloudflare Tunnels (Custom Domain)
See the full step-by-step guide in [CLOUDFLARE_TUNNEL_GUIDE.md](file:///c:/Users/gaash/Desktop/Projects/saferr/CLOUDFLARE_TUNNEL_GUIDE.md).

1. Expose your dashboard at `https://saferr.yourdomain.com` (pointing to `localhost:3000`).
2. Expose your API & WebSockets at `https://api.yourdomain.com` (pointing to `localhost:4000`).

---

### 5. Simulate Child Device (for instant live testing without physical phone)
```bash
cd backend
npx tsx src/mock-child.ts
```
* Emulates live battery draining/charging, simulated walking GPS coordinates, remote screenshot responses, and policy sync.

---

### 6. Build & Install Child Android App

1. Open `child-android/` in Android Studio or build with Gradle:
```bash
cd child-android
./gradlew assembleDebug
```
2. Install APK onto child device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```
3. Open the app on the child phone:
   - Set **Backend URL** to `https://api.yourdomain.com` (or your local IP `http://192.168.1.X:4000` for LAN testing).
   - Enter the **6-Digit Pairing Code** from the Parent Dashboard.
   - Grant requested safety permissions.

---

## 🔑 Key Features Implemented

* ⏱️ **Screen Time Limits & Bedtime Lockout**: Set daily budgets and scheduled downtime. Triggers full-screen lock overlay upon expiry.
* 🚫 **App Blocking**: Remotely restrict TikTok, Roblox, Instagram, YouTube, or custom packages.
* 📍 **Live Location & Geofencing**: Real-time GPS coordinate streaming, interactive Leaflet map tracking, and adjustable safe zone perimeter alerts.
* 🌐 **Content Filtering (Local VPN DNS)**: Intercepts DNS queries on port 53 and blocks adult/gambling/social/gaming domains and custom blocklists.
* 📸 **Remote Screenshots**: Parent can trigger instant screen captures on demand.
* 📹 **Live WebRTC Stream**: Real-time Front Camera, Rear Camera, Screen Share, and Live Microphone safety monitoring.
* 📢 **Transparent Operation**: Active persistent notification ensures child is aware protection is running (non-stealth, safety-focused).

