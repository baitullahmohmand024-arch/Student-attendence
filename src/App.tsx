/**
 * SCHOOLSYNC
 * A clean, fast, professional attendance app for teachers and principals.
 * Features:
 * 1. Bottom Navigation: Scan, Add Student, Classes
 * 2. Scan: Rapid continuous QR scanner with rear-camera preference, audio chime, and green flash
 * 3. Add Student: 6-field form with instant PDF ID Card generation and download
 * 4. Classes: Clean class folders, alphabetical roster, attendance status, and ID card reprint
 * 5. Secure Gmail/Google Login & Firebase Cloud Storage
 * 6. Cloud Backup & Multi-Device Restore
 * 7. Cryptographic App PIN / Password Lock with Rate Limiting
 */

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  UserPlus,
  Folder,
  School as SchoolIcon,
  Edit2,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Lock,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { School, Student } from './types';
import { schoolService } from './services/schoolService';
import { getTodaySchoolDate } from './services/seedData';
import {
  auth,
  onAuthStateChanged,
  testFirestoreConnection,
  FirebaseUser,
} from './services/firebase';
import { pinLockService } from './services/pinLockService';
import { cloudSyncService, SyncStatusState } from './services/cloudSyncService';
import { FastQRScannerScreen } from './components/screens/FastQRScannerScreen';
import { SimpleAddStudentScreen } from './components/screens/SimpleAddStudentScreen';
import { SimpleClassesScreen } from './components/screens/SimpleClassesScreen';
import { WelcomeAuthModal } from './components/auth/WelcomeAuthModal';
import { PinLockModal } from './components/auth/PinLockModal';
import { CloudBackupSettingsModal } from './components/settings/CloudBackupSettingsModal';

type MainTab = 'scan' | 'add_student' | 'classes';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('scan');
  const [currentDate] = useState<string>(getTodaySchoolDate());
  const [preselectedClassId, setPreselectedClassId] = useState<string | undefined>(undefined);

  // Authentication & Cloud Sync
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authResolved, setAuthResolved] = useState(false);
  const [authSkipped, setAuthSkipped] = useState(false);
  const [showWelcomeAuthModal, setShowWelcomeAuthModal] = useState(false);
  const [showCloudBackupModal, setShowCloudBackupModal] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<SyncStatusState>(cloudSyncService.getSyncStatus());

  // App Lock / PIN Protection
  const [isAppLocked, setIsAppLocked] = useState<boolean>(pinLockService.isPinLockEnabled());

  // School name edit modal
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [editingSchoolName, setEditingSchoolName] = useState('');
  const [editingPrincipalName, setEditingPrincipalName] = useState('');
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolEditSuccess, setSchoolEditSuccess] = useState(false);

  // Initialize clean application and listen for auth changes
  const loadApp = async () => {
    try {
      // 1. Initialize local IndexedDB storage
      const activeSchool = await schoolService.initializeCleanApp();
      setSchool(activeSchool);
      setEditingSchoolName(activeSchool.name || 'SchoolSync Academy');
      setEditingPrincipalName(activeSchool.principalName || 'Headmaster');

      // 2. Test Firestore connection in background
      testFirestoreConnection().catch(() => {});

      // 3. Check App PIN Lock status
      if (pinLockService.isPinLockEnabled()) {
        setIsAppLocked(true);
      }
    } catch (err) {
      console.error('Failed to initialize clean app:', err);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadApp();

    // Listen for Firebase Auth user state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setCloudSyncStatus(cloudSyncService.getSyncStatus());
      setAuthResolved(true);
      if (user) {
        setShowWelcomeAuthModal(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleOpenEditSchool = () => {
    if (school) {
      setEditingSchoolName(school.name);
      setEditingPrincipalName(school.principalName || 'Headmaster');
    }
    setShowEditSchoolModal(true);
    setSchoolEditSuccess(false);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editingSchoolName.trim();
    if (!cleanName) return;

    try {
      setSavingSchool(true);
      const updated = await schoolService.updateSchool({
        name: cleanName,
        principalName: editingPrincipalName.trim() || 'Headmaster',
      });
      setSchool(updated);
      setSchoolEditSuccess(true);
      setTimeout(() => {
        setShowEditSchoolModal(false);
        setSchoolEditSuccess(false);
      }, 900);
    } catch (err) {
      console.error('Failed to update school:', err);
    } finally {
      setSavingSchool(false);
    }
  };

  const handleNavigateToAddStudentWithClass = (classId?: string) => {
    setPreselectedClassId(classId);
    setActiveTab('add_student');
  };

  // Called when data is restored from cloud
  const handleSchoolRestored = (restoredSchool: School) => {
    setSchool(restoredSchool);
    setEditingSchoolName(restoredSchool.name);
    setEditingPrincipalName(restoredSchool.principalName || 'Headmaster');
  };

  if (!isReady || !authResolved) {
    return (
      <div className="min-h-screen bg-[#0B192C] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-emerald-300 font-mono text-xs">Loading SchoolSync...</p>
        </div>
      </div>
    );
  }

  // Show Gmail Login at start of app if user is not signed in
  if (!currentUser && !authSkipped) {
    return (
      <WelcomeAuthModal
        isOpen={true}
        onClose={() => setAuthSkipped(true)}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setAuthSkipped(false);
        }}
        onContinueOffline={() => setAuthSkipped(true)}
      />
    );
  }

  const schoolDisplayName = school?.name || 'SchoolSync Academy';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* APP PIN LOCK MODAL (Enforced if App Lock is enabled) */}
      {isAppLocked && (
        <PinLockModal
          isOpen={isAppLocked}
          onUnlocked={() => setIsAppLocked(false)}
        />
      )}

      {/* TOP HEADER: School Name + Cloud Sync Status & Settings Button */}
      <header className="sticky top-0 z-40 bg-[#0B192C] text-white shadow-md border-b border-slate-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-2.5">
          
          {/* School Name (Tap to Edit) */}
          <button
            onClick={handleOpenEditSchool}
            className="flex items-center gap-2.5 text-left group hover:bg-slate-800/80 p-1.5 -ml-1.5 rounded-2xl transition-all cursor-pointer min-w-0 flex-1"
            title="Tap to change School Name"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <SchoolIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-tight truncate max-w-[170px] sm:max-w-xs block">
                  {schoolDisplayName}
                </span>
                <Edit2 className="w-3.5 h-3.5 text-emerald-400 opacity-70 group-hover:opacity-100 shrink-0 transition-opacity" />
              </div>
              <span className="text-[10px] text-emerald-300 font-medium block truncate">
                {school?.principalName ? `Headmaster: ${school.principalName}` : 'Tap to customize school'}
              </span>
            </div>
          </button>

          {/* Right Header Actions: Cloud Backup & Date */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Cloud Backup & Account Button */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowWelcomeAuthModal(true);
                } else {
                  setShowCloudBackupModal(true);
                }
              }}
              title={currentUser ? `Signed in as ${currentUser.email}` : 'Sign in for Cloud Backup'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            >
              <div className="relative">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span
                  className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    currentUser
                      ? 'bg-emerald-400 ring-2 ring-slate-900'
                      : 'bg-amber-400'
                  }`}
                />
              </div>
              <span className="text-[11px] font-bold hidden xs:inline truncate max-w-[70px]">
                {currentUser ? (currentUser.email ? currentUser.email.split('@')[0] : 'Cloud') : 'Login'}
              </span>
            </button>

            {/* Today Date Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs text-slate-300 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px]">{currentDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN VIEW */}
      <main className="flex-1 w-full px-4 pt-4 pb-28">
        {activeTab === 'scan' && (
          <FastQRScannerScreen
            school={school}
            currentDate={currentDate}
            onNavigateToAddStudent={() => setActiveTab('add_student')}
            onNavigateToClasses={() => setActiveTab('classes')}
          />
        )}

        {activeTab === 'add_student' && (
          <SimpleAddStudentScreen
            school={school}
            initialClassId={preselectedClassId}
            onStudentSaved={(_student) => {
              setPreselectedClassId(undefined);
            }}
            onNavigateToScan={() => setActiveTab('scan')}
            onNavigateToClasses={() => setActiveTab('classes')}
          />
        )}

        {activeTab === 'classes' && (
          <SimpleClassesScreen
            school={school}
            onNavigateToAddStudent={handleNavigateToAddStudentWithClass}
            onNavigateToScan={() => setActiveTab('scan')}
          />
        )}
      </main>

      {/* BOTTOM NAVIGATION: ONLY 3 ITEMS (Scan, Add Student, Classes) */}
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl safe-area-bottom"
      >
        <div className="max-w-xl mx-auto px-4 py-2 grid grid-cols-3 gap-2">
          
          {/* 1. SCAN */}
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all cursor-pointer min-h-[58px] ${
              activeTab === 'scan'
                ? 'bg-[#0B192C] text-emerald-400 font-extrabold shadow-md scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <QrCode className={`w-5 h-5 mb-0.5 ${activeTab === 'scan' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-xs tracking-tight">Scan</span>
          </button>

          {/* 2. ADD STUDENT */}
          <button
            onClick={() => {
              setPreselectedClassId(undefined);
              setActiveTab('add_student');
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all cursor-pointer min-h-[58px] ${
              activeTab === 'add_student'
                ? 'bg-[#0B192C] text-emerald-400 font-extrabold shadow-md scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <UserPlus className={`w-5 h-5 mb-0.5 ${activeTab === 'add_student' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-xs tracking-tight">Add Student</span>
          </button>

          {/* 3. CLASSES (Class Folders, Daily Register, & Monthly Attendance) */}
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all cursor-pointer min-h-[58px] ${
              activeTab === 'classes'
                ? 'bg-[#0B192C] text-emerald-400 font-extrabold shadow-md scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Folder className={`w-5 h-5 mb-0.5 ${activeTab === 'classes' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-xs tracking-tight">Classes</span>
          </button>
        </div>
      </nav>

      {/* WELCOME / GMAIL SIGN-IN MODAL */}
      <WelcomeAuthModal
        isOpen={showWelcomeAuthModal}
        onClose={() => setShowWelcomeAuthModal(false)}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setShowWelcomeAuthModal(false);
          setShowCloudBackupModal(true);
        }}
        onContinueOffline={() => setShowWelcomeAuthModal(false)}
      />

      {/* CLOUD BACKUP & MULTI-DEVICE RESTORE SETTINGS MODAL */}
      <CloudBackupSettingsModal
        isOpen={showCloudBackupModal}
        onClose={() => setShowCloudBackupModal(false)}
        school={school}
        onSchoolRestored={handleSchoolRestored}
        onOpenLoginModal={() => setShowWelcomeAuthModal(true)}
      />

      {/* EDIT SCHOOL NAME MODAL */}
      {showEditSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Edit School Details</h3>
              </div>
              <button
                onClick={() => setShowEditSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {schoolEditSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">School Details Updated!</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSchool} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                    School Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editingSchoolName}
                    onChange={(e) => setEditingSchoolName(e.target.value)}
                    placeholder="e.g. Oakridge Public School"
                    className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This name will appear on all generated PDF ID cards.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                    Headmaster / Principal Name
                  </label>
                  <input
                    type="text"
                    value={editingPrincipalName}
                    onChange={(e) => setEditingPrincipalName(e.target.value)}
                    placeholder="e.g. Principal M. Tariq"
                    className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEditSchoolModal(false)}
                    className="px-4 py-2.5 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSchool}
                    className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {savingSchool ? 'Saving...' : 'Save School'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
