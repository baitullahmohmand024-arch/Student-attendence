import React from 'react';
import { Wifi, WifiOff, HardDrive } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-300">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
          isOnline
            ? 'bg-slate-800/80 border-slate-700 text-slate-300'
            : 'bg-amber-950/80 border-amber-600/50 text-amber-200'
        }`}
        title={
          isOnline
            ? 'Connected to local network / internet. Database operating in offline-first IndexedDB mode.'
            : 'Device is offline. All records and attendance actions save locally to IndexedDB.'
        }
      >
        {isOnline ? (
          <Wifi className="w-3 h-3 text-emerald-400" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
        )}
        <span>{isOnline ? 'Network Active' : 'Offline Mode'}</span>
      </div>

      <div
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-300"
        title="Phase 1: Database records stored in client-side IndexedDB. Multi-device central sync scheduled for Phase 2."
      >
        <HardDrive className="w-3 h-3 text-slate-400" />
        <span className="hidden md:inline">Storage:</span>
        <span className="text-emerald-300 font-semibold">Local IndexedDB</span>
      </div>
    </div>
  );
};
