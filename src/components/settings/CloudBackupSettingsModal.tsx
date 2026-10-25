import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Lock,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  User,
  KeyRound
} from 'lucide-react';
import { School } from '../../types';
import { auth, firebaseSignOut, signInWithPopup, googleProvider } from '../../services/firebase';
import { cloudSyncService, CloudSummary } from '../../services/cloudSyncService';
import { pinLockService } from '../../services/pinLockService';

interface CloudBackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  onSchoolRestored: (school: School) => void;
  onOpenLoginModal: () => void;
}

export const CloudBackupSettingsModal: React.FC<CloudBackupSettingsModalProps> = ({
  isOpen,
  onClose,
  school,
  onSchoolRestored,
  onOpenLoginModal,
}) => {
  const currentUser = auth.currentUser;

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState(cloudSyncService.getSyncStatus());
  const [lastSyncTime, setLastSyncTime] = useState(cloudSyncService.getLastSyncTimestamp());
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Cloud Restore state
  const [checkingCloud, setCheckingCloud] = useState(false);
  const [cloudSummary, setCloudSummary] = useState<CloudSummary | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // App Lock / PIN state
  const [pinEnabled, setPinEnabled] = useState(pinLockService.isPinLockEnabled());
  const [showSetPinForm, setShowSetPinForm] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSyncStatus(cloudSyncService.getSyncStatus());
    setLastSyncTime(cloudSyncService.getLastSyncTimestamp());
    setPinEnabled(pinLockService.isPinLockEnabled());

    if (currentUser) {
      checkAvailableCloudRecords();
    }
  }, [isOpen, currentUser]);

  const checkAvailableCloudRecords = async () => {
    setCheckingCloud(true);
    try {
      const summary = await cloudSyncService.checkCloudSchoolSummary();
      setCloudSummary(summary);
    } catch {
      // ignore
    } finally {
      setCheckingCloud(false);
    }
  };

  if (!isOpen) return null;

  // Trigger manual Cloud Backup
  const handleBackupNow = async () => {
    if (!school) return;
    setBackingUp(true);
    setErrorMessage(null);
    setBackupSuccessMessage(null);
    try {
      const result = await cloudSyncService.backupLocalToCloud(school);
      setSyncStatus('synced');
      setLastSyncTime(result.timestamp);
      setBackupSuccessMessage(
        `Cloud Backup Complete! Uploaded ${result.studentsCount} students, ${result.classesCount} classes, and ${result.attendanceCount} attendance records.`
      );
      await checkAvailableCloudRecords();
    } catch (err: any) {
      setSyncStatus('failed');
      setErrorMessage(err.message || 'Failed to complete cloud backup.');
    } finally {
      setBackingUp(false);
    }
  };

  // Trigger manual Cloud Restore
  const handleRestoreNow = async () => {
    if (!cloudSummary) return;
    const confirmed = window.confirm(
      `Restore data from cloud for "${cloudSummary.schoolName}"?\n\nThis will safely import ${cloudSummary.studentsCount} students, ${cloudSummary.classesCount} classes, and ${cloudSummary.attendanceCount} attendance logs into this device.`
    );
    if (!confirmed) return;

    setRestoring(true);
    setErrorMessage(null);
    setRestoreSuccessMessage(null);
    try {
      const result = await cloudSyncService.restoreCloudToLocal(cloudSummary);
      setSyncStatus('synced');
      setLastSyncTime(result.timestamp);
      onSchoolRestored(result.school);
      setRestoreSuccessMessage(
        `Restored successfully! Imported ${result.studentsCount} students and ${result.classesCount} classes.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore cloud records.');
    } finally {
      setRestoring(false);
    }
  };

  // Save new App PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPinMessage(null);

    if (newPin.length < 4) {
      setErrorMessage('PIN must be at least 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('PINs do not match. Please re-enter.');
      return;
    }

    try {
      await pinLockService.setPin(newPin);
      setPinEnabled(true);
      setShowSetPinForm(false);
      setNewPin('');
      setConfirmPin('');
      setPinMessage('App Lock PIN successfully enabled with cryptographic protection.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to set PIN.');
    }
  };

  const handleDisablePin = () => {
    pinLockService.disablePinLock();
    setPinEnabled(false);
    setShowSetPinForm(false);
    setPinMessage('App Lock PIN disabled.');
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign out.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B192C] flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Cloud Backup & Security
              </h2>
              <p className="text-[11px] text-slate-500">
                Google account sync and multi-device restoration.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold flex-1">{errorMessage}</span>
          </div>
        )}

        {backupSuccessMessage && (
          <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{backupSuccessMessage}</span>
          </div>
        )}

        {restoreSuccessMessage && (
          <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{restoreSuccessMessage}</span>
          </div>
        )}

        {pinMessage && (
          <div className="p-3 bg-slate-900 border border-emerald-500 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pinMessage}</span>
          </div>
        )}

        {/* SECTION 1: AUTHENTICATION STATUS */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Account Status
          </span>

          {currentUser ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-sm">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser.displayName || 'Authorized Owner'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Operating Offline</p>
                <p className="text-[11px] text-slate-500">Sign in to enable cloud backup & multi-device restore.</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenLoginModal();
                }}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                Sign In
              </button>
            </div>
          )}

          {currentUser && (
            <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
              Signing out will safely keep all cloud backups intact.
            </p>
          )}
        </div>

        {/* SECTION 2: CLOUD BACKUP & RESTORE */}
        {currentUser && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Cloud Synchronization
            </span>

            {/* Sync Status Banner */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500'
                      : syncStatus === 'syncing'
                      ? 'bg-blue-500 animate-ping'
                      : syncStatus === 'offline'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="font-bold text-slate-700 capitalize">Status: {syncStatus}</span>
              </div>
              {lastSyncTime && (
                <span className="text-[11px] text-slate-400">
                  Last Sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Backup Button */}
            <button
              onClick={handleBackupNow}
              disabled={backingUp}
              className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4 text-emerald-400" />
              <span>{backingUp ? 'Uploading Local Records to Cloud...' : 'Back Up Local Records to Cloud'}</span>
            </button>

            {/* Restore from Cloud Section (Multi-Device Recovery) */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-950">Restore Records on Another Phone</h4>
              </div>

              {checkingCloud ? (
                <p className="text-[11px] text-slate-500">Checking cloud storage for records...</p>
              ) : cloudSummary ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-700">
                    Found cloud backup for <strong>{cloudSummary.schoolName}</strong>:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <span className="text-xs font-black text-slate-900 block">{cloudSummary.studentsCount}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Students</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <span className="text-xs font-black text-slate-900 block">{cloudSummary.classesCount}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Classes</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <span className="text-xs font-black text-slate-900 block">{cloudSummary.attendanceCount}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Logs</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRestoreNow}
                    disabled={restoring}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>{restoring ? 'Restoring records...' : 'Restore Data to this Device'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  No cloud backup found yet for this account. Tap "Back Up Local Records" above to create your first cloud snapshot.
                </p>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: APP PASSWORD / APP PIN LOCK */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">App PIN / Password Lock</span>
            </div>
            {pinEnabled ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-bold border border-emerald-200">
                Enabled ✓
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                Disabled
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Require a secret 4-digit PIN every time the app opens. Stored securely with PBKDF2 cryptography.
          </p>

          {!showSetPinForm ? (
            <div className="flex items-center gap-2 pt-1">
              {pinEnabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSetPinForm(true)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors"
                  >
                    Change PIN
                  </button>
                  <button
                    type="button"
                    onClick={handleDisablePin}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Disable Lock
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSetPinForm(true)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Set Up App PIN</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSavePin} className="space-y-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Create PIN (4+ digits)
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full p-2.5 text-xs bg-white rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  className="w-full p-2.5 text-xs bg-white rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSetPinForm(false)}
                  className="flex-1 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-900"
                >
                  Save PIN
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SECTION 4: PRIVACY NOTICE */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Privacy & Access Control</span>
          </div>
          <p className="leading-relaxed">
            SchoolSync stores your student records locally first. Cloud backups are transmitted securely over TLS to your private Firestore instance and restricted exclusively to your authorized Google identity.
          </p>
        </div>

      </div>
    </div>
  );
};
