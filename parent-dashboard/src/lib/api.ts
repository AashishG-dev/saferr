import { io, Socket } from 'socket.io-client';
import {
  ChildDevice,
  ScreenTimePolicy,
  WebFilterPolicy,
  LocationPoint,
  AppUsage,
  RemoteScreenshot,
  SafetyAlert
} from '../types';

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string) ||
  (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '10.0.2.2'
    ? 'http://localhost:4000'
    : hostname.includes('portal.')
    ? `https://${hostname.replace('portal.', 'api.')}`
    : `${window.location.origin}`);

export const API_BASE = `${SOCKET_URL}/api`;

let socket: Socket | null = null;

export function getSocket(deviceId?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      query: {
        type: 'parent',
        deviceId: deviceId || 'child-demo-01'
      }
    });
  }
  return socket;
}

export const api = {
  // Devices
  async getDevices(): Promise<ChildDevice[]> {
    const res = await fetch(`${API_BASE}/devices`);
    const json = await res.json();
    return json.data;
  },

  async generatePairing(name: string): Promise<{ deviceId: string; pairingCode: string }> {
    const res = await fetch(`${API_BASE}/devices/generate-pairing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const json = await res.json();
    return json.data;
  },

  // Screen Time
  async getScreenTime(deviceId: string): Promise<ScreenTimePolicy> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/screentime`);
    const json = await res.json();
    return json.data;
  },

  async updateScreenTime(deviceId: string, policy: Partial<ScreenTimePolicy>): Promise<ScreenTimePolicy> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/screentime`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    const json = await res.json();
    return json.data;
  },

  // Web Filter
  async getWebFilter(deviceId: string): Promise<WebFilterPolicy> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/webfilter`);
    const json = await res.json();
    return json.data;
  },

  async updateWebFilter(deviceId: string, policy: Partial<WebFilterPolicy>): Promise<WebFilterPolicy> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/webfilter`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    const json = await res.json();
    return json.data;
  },

  // Locations
  async getLocations(deviceId: string): Promise<LocationPoint[]> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/locations`);
    const json = await res.json();
    return json.data;
  },

  // App Usage
  async getAppUsage(deviceId: string): Promise<AppUsage[]> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/usage`);
    const json = await res.json();
    return json.data;
  },

  // Screenshots
  async getScreenshots(deviceId: string): Promise<RemoteScreenshot[]> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/screenshots`);
    const json = await res.json();
    return json.data;
  },

  // Alerts
  async getAlerts(deviceId?: string): Promise<SafetyAlert[]> {
    const url = deviceId ? `${API_BASE}/alerts?deviceId=${deviceId}` : `${API_BASE}/alerts`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data;
  }
};
