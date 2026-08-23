# ☁️ Cloudflare Tunnel Setup Guide for Saferr

This guide walks you through deploying **Saferr** on your custom domain using Cloudflare Tunnels (Zero Trust) with full HTTPS and WebSocket support.

---

## 📋 Architecture Overview

* **Parent Web Dashboard**: `https://saferr.yourdomain.com` (routes to `localhost:3000`)
* **Backend API & WebSockets**: `https://api.yourdomain.com` (routes to `localhost:4000`)

Cloudflare Tunnels give you free, automatic SSL certificates, DDoS protection, and eliminate the need to open ports on your home or VPS router/firewall.

---

## 🚀 Method 1: Zero Trust Web Dashboard (Easiest & Recommended)

### Step 1: Open Cloudflare Zero Trust
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left sidebar, click **Zero Trust**.
3. Navigate to **Networks** ➔ **Tunnels**.
4. Click **Create a Tunnel** (Select **Cloudflared** as connector type) and name it `saferr-tunnel`.

### Step 2: Install Connector
Choose your operating system (Windows, Linux/Docker, macOS):
* **For Windows**: Download the `.msi` or copy the PowerShell command shown in the dashboard.
* **For Docker**: Run the `docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <YOUR_TUNNEL_TOKEN>` command.

### Step 3: Configure Public Hostnames
In the Cloudflare Web UI under the **Public Hostnames** tab of your tunnel:

#### 1. Add Frontend Dashboard Hostname:
* **Subdomain**: `saferr` (or `dashboard`)
* **Domain**: `yourdomain.com`
* **Type**: `HTTP`
* **URL**: `localhost:3000` (or `saferr-dashboard:80` if using Docker network)
* Click **Save Hostname**.

#### 2. Add Backend API & WebSocket Hostname:
* **Subdomain**: `api` (or `api-saferr`)
* **Domain**: `yourdomain.com`
* **Type**: `HTTP`
* **URL**: `localhost:4000` (or `saferr-backend:4000` if using Docker network)
* *Under Additional Application Settings -> HTTP Settings*:
  - **No TLS Verify**: Off
  - **HTTP2 Origin**: Off
  - *(Note: Cloudflare automatically proxies WebSocket / WSS traffic over HTTP)*
* Click **Save Hostname**.

---

## 🛠️ Method 2: CLI-Based Cloudflared Setup

If you prefer configuring via the CLI and config files:

1. **Install cloudflared**:
   ```bash
   # Windows (winget)
   winget install --id Cloudflare.cloudflared
   
   # Linux (Ubuntu/Debian)
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. **Login to Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create Tunnel**:
   ```bash
   cloudflared tunnel create saferr-tunnel
   ```
   *(Note the Tunnel UUID output in the terminal)*

4. **Configure DNS Routes**:
   ```bash
   cloudflared tunnel route dns saferr-tunnel saferr.yourdomain.com
   cloudflared tunnel route dns saferr-tunnel api.yourdomain.com
   ```

5. **Create / Edit Config File (`~/.cloudflared/config.yml`)**:
   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: /path/to/<TUNNEL_UUID>.json

   ingress:
     - hostname: saferr.yourdomain.com
       service: http://localhost:3000
     - hostname: api.yourdomain.com
       service: http://localhost:4000
     - service: http_status:404
   ```

6. **Run Tunnel**:
   ```bash
   cloudflared tunnel run saferr-tunnel
   ```

---

## 📱 Connecting the Android Child App

1. Build or install the APK on the child's device.
2. In the initial setup screen:
   - **Backend Server URL**: Set to `https://api.yourdomain.com` (Notice `https://` — Cloudflare terminates SSL).
   - **Pairing Code**: Enter the 6-digit code generated from your parent portal (`https://saferr.yourdomain.com`).
3. Grant necessary permissions (Device Administrator, Usage Access, Overlay, Location, Battery Optimization).
4. The child device is now live and communicating securely over Cloudflare Tunnels!

---

## 🌐 Connecting the Parent Dashboard

1. In `parent-dashboard/.env`, set:
   ```env
   VITE_SOCKET_URL=https://api.yourdomain.com
   ```
2. Build / restart the dashboard:
   ```bash
   cd parent-dashboard
   npm run build
   # or run dev server
   npm run dev
   ```
3. Visit `https://saferr.yourdomain.com` in any browser.

---

## 🐳 Quick Start with Docker Compose

To run everything locally in containers with one command:

```bash
docker-compose up -d --build
```
* Backend starts on port `4000`
* Frontend starts on port `3000`
