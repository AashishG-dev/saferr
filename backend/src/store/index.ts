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
    // Starts with a clean production database. New devices are registered upon pairing.
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

  deleteDevice(id: string): boolean {
    const raw = id.replace(/^child-/, '');
    const prevLen = this.data.devices.length;
    this.data.devices = this.data.devices.filter(
      (d) => d.id !== id && d.pairingCode !== id && d.pairingCode !== raw && d.id !== `child-${id}`
    );
    if (this.data.devices.length !== prevLen) {
      delete this.data.screenTimePolicies[id];
      delete this.data.screenTimePolicies[`child-${id}`];
      delete this.data.webFilterPolicies[id];
      delete this.data.webFilterPolicies[`child-${id}`];
      this.data.locations = this.data.locations.filter((l) => l.deviceId !== id && l.deviceId !== `child-${id}`);
      this.data.appUsage = this.data.appUsage.filter((u) => u.deviceId !== id && u.deviceId !== `child-${id}`);
      this.data.screenshots = this.data.screenshots.filter((s) => s.deviceId !== id && s.deviceId !== `child-${id}`);
      this.data.alerts = this.data.alerts.filter((a) => a.deviceId !== id && a.deviceId !== `child-${id}`);
      this.save();
      return true;
    }
    return false;
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

  deleteScreenshot(id: string): boolean {
    const prevLen = this.data.screenshots.length;
    this.data.screenshots = this.data.screenshots.filter((s) => s.id !== id);
    if (this.data.screenshots.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  deleteAllScreenshots(deviceId: string): number {
    const prevLen = this.data.screenshots.length;
    this.data.screenshots = this.data.screenshots.filter((s) => s.deviceId !== deviceId);
    const count = prevLen - this.data.screenshots.length;
    this.save();
    return count;
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
