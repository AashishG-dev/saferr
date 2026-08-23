import React, { useState } from 'react';
import { Clock, Moon, Ban, Save, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { ScreenTimePolicy, AppUsage } from '../types';

interface ScreenTimeViewProps {
  policy: ScreenTimePolicy;
  appUsages: AppUsage[];
  onSavePolicy: (policy: Partial<ScreenTimePolicy>) => void;
}

const COMMON_APPS = [
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok', category: 'Social' },
  { packageName: 'com.instagram.android', name: 'Instagram', category: 'Social' },
  { packageName: 'com.google.android.youtube', name: 'YouTube', category: 'Video' },
  { packageName: 'com.roblox.client', name: 'Roblox', category: 'Games' },
  { packageName: 'com.supercell.clashroyale', name: 'Clash Royale', category: 'Games' },
  { packageName: 'com.snapchat.android', name: 'Snapchat', category: 'Social' },
  { packageName: 'com.whatsapp', name: 'WhatsApp', category: 'Chat' },
  { packageName: 'com.discord', name: 'Discord', category: 'Chat' }
];

export const ScreenTimeView: React.FC<ScreenTimeViewProps> = ({ policy, appUsages, onSavePolicy }) => {
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(policy.dailyLimitMinutes);
  const [blockedApps, setBlockedApps] = useState<string[]>(policy.blockedApps || []);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleBlockApp = (packageName: string) => {
    if (blockedApps.includes(packageName)) {
      setBlockedApps(blockedApps.filter((p) => p !== packageName));
    } else {
      setBlockedApps([...blockedApps, packageName]);
    }
  };

  const handleSave = () => {
    onSavePolicy({
      dailyLimitMinutes,
      blockedApps
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            Screen Time &amp; App Controls
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enforce daily time limits and restrict distracting apps.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedSuccess ? 'Policies Synced!' : 'Save & Enforce'}
        </button>
      </div>

      {/* Daily Screen Time Budget */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            Daily Time Budget
          </h3>
          <span className="text-lg font-black text-sky-400">
            {Math.floor(dailyLimitMinutes / 60)}h {dailyLimitMinutes % 60}m
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Total device usage permitted each day before lock overlay activates.
        </p>

        <input
          type="range"
          min="30"
          max="480"
          step="15"
          value={dailyLimitMinutes}
          onChange={(e) => setDailyLimitMinutes(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />

        <div className="flex justify-between text-xs text-slate-500 font-mono">
          <span>30m</span>
          <span>1h</span>
          <span>2h</span>
          <span>4h</span>
          <span>6h</span>
          <span>8h</span>
        </div>
      </div>

      {/* App Restriction Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              App Blocking &amp; Restrictions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle specific apps off to immediately prevent access on the child phone.
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            {blockedApps.length} Apps Blocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {COMMON_APPS.map((app) => {
            const isBlocked = blockedApps.includes(app.packageName);
            return (
              <div
                key={app.packageName}
                onClick={() => toggleBlockApp(app.packageName)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isBlocked
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{app.name}</div>
                  <div className="text-[10px] text-slate-400">{app.category}</div>
                </div>

                <button
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    isBlocked
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isBlocked ? 'Blocked' : 'Allowed'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
