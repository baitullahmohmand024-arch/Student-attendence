import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Menu, Check } from 'lucide-react';
import { School, User } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { OfflineIndicator } from '../common/OfflineIndicator';

interface HeaderProps {
  school: School | null;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onOpenMobileMenu: () => void;
  currentDate: string;
}

export const Header: React.FC<HeaderProps> = ({
  school,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenMobileMenu,
  currentDate,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="no-print bg-[#0B192C] text-white border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & School Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-bold text-white tracking-wider shrink-0 text-sm shadow-sm">
              SS
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="font-bold text-base tracking-tight text-white whitespace-nowrap leading-tight">
                SchoolSync
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[240px]">
                {school?.name || 'School Setup Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Date / Status Telemetry */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="text-slate-400">School Date:</span>
            <span className="font-mono tabular-nums font-medium text-emerald-400">
              {currentDate}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{school?.academicYear || '2026-2027'}</span>
          </div>
          <OfflineIndicator />
        </div>

        {/* Zone 3: Actions & User Session */}
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton />

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/80 transition-colors text-left"
              title="Switch user role profile"
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                  currentUser.role === 'principal'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {currentUser.role === 'principal' ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  {currentUser.role}
                </span>
              </div>
            </button>

            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-slate-900">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-800">Switch Active Profile</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Phase 1 Client Simulator: Principal vs Teacher scope
                    </p>
                  </div>

                  <div className="py-1">
                    {allUsers.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors text-xs ${
                            isSelected ? 'bg-slate-100/70 font-semibold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                u.role === 'principal' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            <div className="truncate">
                              <p className="truncate font-medium">{u.fullName}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                {u.role}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[10px] text-slate-500">
                    Role-isolated data access active.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
