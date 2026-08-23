import fs from 'fs';
import path from 'path';
import {
  ChildDevice,
  ScreenTimePolicy,
  WebFilterPolicy,
  LocationPoint,
  AppUsage,
  RemoteScreenshot,
  SafetyAlert
} from '../types/index.js';

interface DatabaseSchema {
  devices: ChildDevice[];
  screenTimePolicies: Record<string, ScreenTimePolicy>;
  webFilterPolicies: Record<string, WebFilterPolicy>;
  locations: LocationPoint[];
  appUsage: AppUsage[];
  screenshots: RemoteScreenshot[];
  alerts: SafetyAlert[];
}

const DB_FILE = path.join(process.cwd(), 'data.json');

class DataStore {
  private data: DatabaseSchema = {
    devices: [],
    screenTimePolicies: {},
    webFilterPolicies: {},
    locations: [],
    appUsage: [],
    screenshots: [],
    alerts: []
  };

  constructor() {
    this.load();
    this.seedDefaultDeviceIfEmpty();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to load DB file, initializing fresh:', err);
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write DB file:', err);
    }
  }

  private seedDefaultDeviceIfEmpty() {
    if (this.data.devices.length === 0) {
      const demoId = 'child-demo-01';
      this.data.devices.push({
        id: demoId,
        name: "Alex's Galaxy A54",
        pairingCode: '749201',
        isPaired: true,
        model: 'Samsung SM-A546B',
        osVersion: 'Android 14 (API 34)',
        batteryLevel: 82,
        isCharging: false,
        isLocked: false,
        lastSeen: new Date().toISOString(),
        status: 'online'
      });

      this.data.screenTimePolicies[demoId] = {
        deviceId: demoId,
        dailyLimitMinutes: 120,
        bedtimeStart: '21:30',
        bedtimeEnd: '07:00',
        isLocked: false,
        blockedApps: ['com.zhiliaoapp.musically', 'com.supercell.clashroyale'],
        allowedAppTime: {
          'com.google.android.youtube': 45,
          'com.instagram.android': 30
        }
      };

      this.data.webFilterPolicies[demoId] = {
        deviceId: demoId,
        enabled: true,
        blockedCategories: ['adult', 'gambling', 'weapons'],
        blockedDomains: ['tiktok.com', 'roblox.com', 'omegle.com'],
        allowedDomains: ['wikipedia.org', 'khanacademy.org', 'google.com']
      };

      this.data.locations.push({
        id: 'loc-001',
        deviceId: demoId,
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8.5,
        timestamp: new Date().toISOString(),
        address: 'San Francisco, CA'
      });

      this.data.appUsage.push(
        { id: 'u1', deviceId: demoId, packageName: 'com.google.android.youtube', appName: 'YouTube', usageMinutes: 42, lastUsed: new Date().toISOString(), category: 'Entertainment' },
        { id: 'u2', deviceId: demoId, packageName: 'com.instagram.android', appName: 'Instagram', usageMinutes: 28, lastUsed: new Date().toISOString(), category: 'Social' },
        { id: 'u3', deviceId: demoId, packageName: 'com.whatsapp', appName: 'WhatsApp', usageMinutes: 19, lastUsed: new Date().toISOString(), category: 'Communication' },
        { id: 'u4', deviceId: demoId, packageName: 'com.roblox.client', appName: 'Roblox', usageMinutes: 35, lastUsed: new Date().toISOString(), category: 'Games' }
      );

      this.data.alerts.push({
        id: 'alt-1',
        deviceId: demoId,
        type: 'BLOCKED_SITE_ATTEMPT',
        message: 'Attempted access to blocked site: omegle.com',
        severity: 'medium',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      });

      this.save();
    }
  }

  // Device Methods
  getDevices(): ChildDevice[] {
    return this.data.devices;
  }

  getDeviceById(id: string): ChildDevice | undefined {
    const raw = id.replace(/^child-/, '');
    return this.data.devices.find((d) => d.id === id || d.pairingCode === id || d.pairingCode === raw || d.id === `child-${id}`);
  }

  getDeviceByPairingCode(code: string): ChildDevice | undefined {
    const clean = code.replace(/^child-/, '');
    return this.data.devices.find((d) => d.pairingCode === code || d.pairingCode === clean);
  }

  addDevice(device: ChildDevice): ChildDevice {
    this.data.devices.push(device);
    this.save();
    return device;
  }

  updateDevice(id: string, partial: Partial<ChildDevice>): ChildDevice | undefined {
    const dev = this.getDeviceById(id);
    if (!dev) return undefined;
    Object.assign(dev, partial);
    this.save();
    return dev;
  }

  // Screen Time Policy
  getScreenTimePolicy(deviceId: string): ScreenTimePolicy {
    if (!this.data.screenTimePolicies[deviceId]) {
      this.data.screenTimePolicies[deviceId] = {
        deviceId,
        dailyLimitMinutes: 120,
        bedtimeStart: '21:00',
        bedtimeEnd: '07:00',
        isLocked: false,
        blockedApps: [],
        allowedAppTime: {}
      };
      this.save();
    }
    return this.data.screenTimePolicies[deviceId];
  }

  updateScreenTimePolicy(deviceId: string, policy: Partial<ScreenTimePolicy>): ScreenTimePolicy {
    const existing = this.getScreenTimePolicy(deviceId);
    const updated = { ...existing, ...policy };
    this.data.screenTimePolicies[deviceId] = updated;
    this.save();
    return updated;
  }

  // Web Filter Policy
  getWebFilterPolicy(deviceId: string): WebFilterPolicy {
    if (!this.data.webFilterPolicies[deviceId]) {
      this.data.webFilterPolicies[deviceId] = {
        deviceId,
        enabled: true,
        blockedCategories: ['adult', 'gambling'],
        blockedDomains: [],
        allowedDomains: []
      };
      this.save();
    }
    return this.data.webFilterPolicies[deviceId];
  }

  updateWebFilterPolicy(deviceId: string, policy: Partial<WebFilterPolicy>): WebFilterPolicy {
    const existing = this.getWebFilterPolicy(deviceId);
    const updated = { ...existing, ...policy };
    this.data.webFilterPolicies[deviceId] = updated;
    this.save();
    return updated;
  }

  // Locations
  addLocation(loc: LocationPoint) {
    this.data.locations.unshift(loc);
    // keep last 500 points
    if (this.data.locations.length > 500) {
      this.data.locations = this.data.locations.slice(0, 500);
    }
    this.save();
  }

  getLocations(deviceId: string, limit = 50): LocationPoint[] {
    return this.data.locations.filter((l) => l.deviceId === deviceId).slice(0, limit);
  }

  // App Usage
  updateAppUsage(deviceId: string, usages: AppUsage[]) {
    this.data.appUsage = [
      ...usages,
      ...this.data.appUsage.filter((u) => u.deviceId !== deviceId)
    ];
    this.save();
  }

  getAppUsage(deviceId: string): AppUsage[] {
    return this.data.appUsage.filter((u) => u.deviceId === deviceId);
  }

  // Screenshots
  addScreenshot(shot: RemoteScreenshot) {
    this.data.screenshots.unshift(shot);
    if (this.data.screenshots.length > 100) {
      this.data.screenshots = this.data.screenshots.slice(0, 100);
    }
    this.save();
  }

  getScreenshots(deviceId: string): RemoteScreenshot[] {
    return this.data.screenshots.filter((s) => s.deviceId === deviceId);
  }

  // Alerts
  addAlert(alert: SafetyAlert) {
    this.data.alerts.unshift(alert);
    if (this.data.alerts.length > 200) {
      this.data.alerts = this.data.alerts.slice(0, 200);
    }
    this.save();
  }

  getAlerts(deviceId?: string): SafetyAlert[] {
    if (deviceId) {
      return this.data.alerts.filter((a) => a.deviceId === deviceId);
    }
    return this.data.alerts;
  }
}

export const store = new DataStore();
