export interface ChildDevice {
  id: string;
  name: string;
  pairingCode: string;
  isPaired: boolean;
  model: string;
  osVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  isLocked: boolean;
  lastSeen: string;
  status: 'online' | 'offline';
}

export interface ScreenTimePolicy {
  deviceId: string;
  dailyLimitMinutes: number;
  bedtimeStart: string;
  bedtimeEnd: string;
  isLocked: boolean;
  blockedApps: string[];
  allowedAppTime: Record<string, number>;
}

export interface WebFilterPolicy {
  deviceId: string;
  enabled: boolean;
  blockedCategories: string[];
  blockedDomains: string[];
  allowedDomains: string[];
}

export interface LocationPoint {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
}

export interface AppUsage {
  id: string;
  deviceId: string;
  packageName: string;
  appName: string;
  usageMinutes: number;
  lastUsed: string;
  category?: string;
}

export interface RemoteScreenshot {
  id: string;
  deviceId: string;
  imageUrl: string;
  timestamp: string;
  triggeredBy: 'manual' | 'schedule' | 'keyword_alert';
}

export interface SafetyAlert {
  id: string;
  deviceId: string;
  type: 'GEOFENCE_EXIT' | 'SCREEN_TIME_EXCEEDED' | 'BLOCKED_SITE_ATTEMPT' | 'DEVICE_TAMPER' | 'LOW_BATTERY';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}
