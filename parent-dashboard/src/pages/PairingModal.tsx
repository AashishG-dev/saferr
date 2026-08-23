import React, { useState } from 'react';
import { X, Smartphone, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { ChildDevice } from '../types';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired: (device: ChildDevice) => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose, onDevicePaired }) => {
  const [childName, setChildName] = useState('');
  const [pairingData, setPairingData] = useState<{ deviceId: string; pairingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!childName.trim()) return;
    setLoading(true);
    try {
      const data = await api.generatePairing(childName);
      setPairingData(data);
    } catch (err) {
      console.error('Failed to generate pairing', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!pairingData) return;
    navigator.clipboard.writeText(pairingData.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Pair New Child Device</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!pairingData ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Enter your child's name or device label to generate an enrollment code.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Child or Device Name
              </label>
              <input
                type="text"
                placeholder="e.g. Emma's Pixel 8"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!childName.trim() || loading}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-sky-500/20"
            >
              {loading ? 'Generating Code...' : 'Generate 6-Digit Pairing Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pairing Code
              </span>
              <div className="text-3xl font-black text-sky-400 tracking-widest font-mono">
                {pairingData.pairingCode}
              </div>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 pt-1"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to clipboard' : 'Copy Code'}
              </button>
            </div>

            <div className="text-left bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <span className="font-bold text-slate-200 block">Next Steps on Child Phone:</span>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li>Open <b>Child Safety Shield</b> app on the child phone.</li>
                <li>Enter the 6-digit pairing code <b>{pairingData.pairingCode}</b>.</li>
                <li>Grant Device Admin, Usage Access &amp; VPN filters.</li>
              </ol>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
