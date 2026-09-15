import React from 'react';
import { Plus, RefreshCw, Layers, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoPollEnabled: boolean;
  onToggleAutoPoll: () => void;
  lastSyncedAt: Date | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
  autoPollEnabled,
  onToggleAutoPoll,
  lastSyncedAt,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm shadow-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Job Queue Dashboard
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Distributed background job lifecycle manager
              </p>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Auto-poll status indicator & toggle */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={onToggleAutoPoll}
                title={autoPollEnabled ? "Pause automatic 6s polling" : "Resume automatic 6s polling"}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    autoPollEnabled ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className="hidden md:inline">
                  {autoPollEnabled ? 'Live Polling (6s)' : 'Polling Paused'}
                </span>
              </button>
              {lastSyncedAt && (
                <span className="text-slate-400 text-[11px] hidden lg:inline">
                  • {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>

            {/* Manual Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 transition shadow-sm"
              title="Refresh job list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {/* Create Job button */}
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
