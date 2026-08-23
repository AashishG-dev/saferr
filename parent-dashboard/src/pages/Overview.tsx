import React from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ChildDevice, ScreenTimePolicy, WebFilterPolicy, LocationPoint, AppUsage, SafetyAlert } from '../types';

interface OverviewProps {
  device: ChildDevice;
  screenTime: ScreenTimePolicy | null;
  webFilter: WebFilterPolicy | null;
  latestLocation: LocationPoint | null;
  appUsages: AppUsage[];
  alerts: SafetyAlert[];
  onNavigateTab: (tab: string) => void;
  onToggleLock: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  device,
  screenTime,
  webFilter,
  latestLocation,
  appUsages,
  alerts,
  onNavigateTab,
  onToggleLock
}) => {
  const totalUsedMinutes = appUsages.reduce((acc, curr) => acc + curr.usageMinutes, 0);
  const dailyLimit = screenTime?.dailyLimitMinutes || 120;
  const remainingMinutes = Math.max(0, dailyLimit - totalUsedMinutes);
  const usagePercent = Math.min(100, Math.round((totalUsedMinutes / dailyLimit) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{device.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  device.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {device.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {device.model} • {device.osVersion} • Last seen: {new Date(device.lastSeen).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Battery Status */}
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
            {device.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            ) : (
              <Battery className={`w-4 h-4 ${device.batteryLevel < 20 ? 'text-rose-400' : 'text-sky-400'}`} />
            )}
            <span className="font-semibold text-slate-200">{device.batteryLevel}%</span>
            <span className="text-slate-500">{device.isCharging ? 'Charging' : 'Battery'}</span>
          </div>

          {/* Quick Lock Button */}
          <button
            onClick={onToggleLock}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              device.isLocked
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
            }`}
          >
            {device.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {device.isLocked ? 'Phone is Locked' : 'Instant Lock'}
          </button>
        </div>
      </div>

      {/* Grid of Key Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Screen Time Card */}
        <div
          onClick={() => onNavigateTab('screentime')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Screen Time</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalUsedMinutes}m</span>
              <span className="text-xs text-slate-500">/ {dailyLimit}m limit</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-sky-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {remainingMinutes > 0 ? `${remainingMinutes}m remaining today` : 'Daily limit exceeded'}
            </p>
          </div>
        </div>

        {/* 2. Live Location Card */}
        <div
          onClick={() => onNavigateTab('location')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-white line-clamp-1">
              {latestLocation?.address || 'San Francisco, CA'}
            </span>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {latestLocation?.latitude.toFixed(4)}, {latestLocation?.longitude.toFixed(4)}
            </p>
            <div className="mt-3 flex items-center text-xs text-emerald-400 font-semibold group-hover:underline">
              View on Map <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>

        {/* 3. Live Monitor & Camera Stream */}
        <div
          onClick={() => onNavigateTab('live')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Monitor</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-white">Remote Safety Stream</span>
            <p className="text-xs text-slate-400 mt-1">
              Live Screen, Camera, Audio &amp; Instant Screenshots.
            </p>
            <div className="mt-3 flex items-center text-xs text-rose-400 font-semibold group-hover:underline">
              Open Stream <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>

      </div>

      {/* Two Column Layout: App Activity + Recent Safety Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Today's App Breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Top App Activity Today</h3>
              <p className="text-xs text-slate-400">Track child screen time across apps</p>
            </div>
            <button
              onClick={() => onNavigateTab('screentime')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              Manage App Limits
            </button>
          </div>

          <div className="space-y-3">
            {appUsages.map((app) => {
              const pct = Math.min(100, Math.round((app.usageMinutes / (dailyLimit || 120)) * 100));
              return (
                <div key={app.id} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{app.appName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {app.category || 'General'}
                      </span>
                    </div>
                    <span className="font-bold text-sky-400">{app.usageMinutes} mins</span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Safety Alerts Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Safety Alerts
            </h3>
            <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-semibold">
              {alerts.length} Total
            </span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-8">No safety alerts recorded.</p>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                        alert.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-400'
                          : alert.severity === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
