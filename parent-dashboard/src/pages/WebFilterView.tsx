import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Globe, Save, CheckCircle2, AlertOctagon } from 'lucide-react';
import { WebFilterPolicy } from '../types';

interface WebFilterViewProps {
  policy: WebFilterPolicy;
  onSavePolicy: (policy: Partial<WebFilterPolicy>) => void;
}

const CATEGORIES = [
  { id: 'adult', label: 'Adult & Explicit Content', desc: 'Blocks pornography and adult sites' },
  { id: 'gambling', label: 'Gambling & Betting', desc: 'Blocks online casinos and betting portals' },
  { id: 'social', label: 'Social Networks', desc: 'Blocks TikTok, Instagram, Twitter web access' },
  { id: 'gaming', label: 'Online Games', desc: 'Blocks web gaming and Roblox portals' },
  { id: 'weapons', label: 'Violence & Weapons', desc: 'Blocks hazardous and violent portals' }
];

export const WebFilterView: React.FC<WebFilterViewProps> = ({ policy, onSavePolicy }) => {
  const [enabled, setEnabled] = useState(policy.enabled);
  const [blockedCategories, setBlockedCategories] = useState<string[]>(policy.blockedCategories || []);
  const [blockedDomains, setBlockedDomains] = useState<string[]>(policy.blockedDomains || []);
  const [newDomain, setNewDomain] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleCategory = (catId: string) => {
    if (blockedCategories.includes(catId)) {
      setBlockedCategories(blockedCategories.filter((c) => c !== catId));
    } else {
      setBlockedCategories([...blockedCategories, catId]);
    }
  };

  const addDomain = () => {
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleaned || blockedDomains.includes(cleaned)) return;
    setBlockedDomains([...blockedDomains, cleaned]);
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    setBlockedDomains(blockedDomains.filter((d) => d !== domain));
  };

  const handleSave = () => {
    onSavePolicy({
      enabled,
      blockedCategories,
      blockedDomains
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Content &amp; Safe Web Filter
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Local VPN DNS packet filtering blocks inappropriate websites on the child device.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedSuccess ? 'Filter Rules Synced!' : 'Apply Web Filters'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Category-level Content Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              Content Categories
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <p className="text-xs text-slate-400">
            Automatically drop DNS queries for websites matching selected safety categories.
          </p>

          <div className="space-y-2.5 pt-2">
            {CATEGORIES.map((cat) => {
              const isChecked = blockedCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{cat.label}</div>
                    <div className="text-[10px] text-slate-400">{cat.desc}</div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                      isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isChecked ? 'Blocked' : 'Allowed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Custom Blocked Domains */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Custom Blocked Domains
            </h3>
            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              {blockedDomains.length} Domains
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Explicitly block specific domain names across all child web browsers.
          </p>

          {/* Add Domain Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. tiktok.com or roblox.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={addDomain}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Blocked Domains List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pt-2">
            {blockedDomains.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-8">No custom blocked domains added.</p>
            ) : (
              blockedDomains.map((dom) => (
                <div
                  key={dom}
                  className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs font-mono"
                >
                  <span className="text-slate-300">{dom}</span>
                  <button
                    onClick={() => removeDomain(dom)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
