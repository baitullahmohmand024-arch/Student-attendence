import React, { useState } from 'react';
import {
  Building,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  GraduationCap,
  Globe
} from 'lucide-react';
import { schoolService } from '../../services/schoolService';
import { School } from '../../types';

interface SchoolSetupWizardProps {
  onComplete: () => void;
}

const COMMON_TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Australia/Sydney',
];

export const SchoolSetupWizard: React.FC<SchoolSetupWizardProps> = ({ onComplete }) => {
  const [setupMode, setSetupMode] = useState<'welcome' | 'custom'>('welcome');
  const [loading, setLoading] = useState(false);

  // Form Fields for custom setup
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [timezone, setTimezone] = useState('Europe/London');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [term, setTerm] = useState('Term 1');
  const [principalName, setPrincipalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoadDemo = async () => {
    try {
      setLoading(true);
      await schoolService.initializeWithSeedData();
      onComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo setup failed';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('School name is required.');
      return;
    }
    if (!principalName.trim()) {
      setErrorMessage("Principal's name is required.");
      return;
    }

    try {
      setLoading(true);
      await schoolService.initializeBlankSchool({
        name: name.trim(),
        country: country.trim(),
        timezone,
        academicYear: academicYear.trim(),
        term: term.trim(),
        workingDays,
        principalName: principalName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        preferences: {
          cutOffTime: '08:30',
          requireLeaveReason: true,
          allowTeacherCorrectionBeforeFinalize: true,
          defaultStatus: 'pending',
          lateGraceMinutes: 15,
        },
      });

      onComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const DAYS = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 0, label: 'Sun' },
  ];

  const toggleDay = (d: number) => {
    if (workingDays.includes(d)) {
      if (workingDays.length <= 1) return;
      setWorkingDays(workingDays.filter((n) => n !== d));
    } else {
      setWorkingDays([...workingDays, d].sort());
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 font-bold text-lg text-white mb-2 shadow-lg">
            SS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            SchoolSync
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Professional, offline-first school administration and QR attendance management system.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-200 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {setupMode === 'welcome' ? (
          <div className="bg-slate-850 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Initialize School Database</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose how you would like to start. You can load a realistic international academy sample dataset with active students and roll calls, or register your custom school from scratch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Option A: Quick Demo Dataset */}
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={loading}
                className="p-5 rounded-lg border-2 border-emerald-600/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-left space-y-3 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-400">
                    Recommended
                  </span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Oakwood Academy Demo
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Preloaded with 4 classes, 51 students with QR credentials, teachers, and today's active register data.
                  </p>
                </div>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                  <span>Start with Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option B: Custom School Setup */}
              <button
                type="button"
                onClick={() => setSetupMode('custom')}
                disabled={loading}
                className="p-5 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-left space-y-3 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                    Fresh Setup
                  </span>
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-slate-200 transition-colors">
                    Custom School Setup
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure your school identity, principal credentials, country, working days, and grading policies.
                  </p>
                </div>
                <div className="text-xs text-slate-300 font-semibold flex items-center gap-1 pt-1">
                  <span>Configure School</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center font-mono">
              Offline-ready: Stored locally in browser IndexedDB. Works without internet.
            </div>
          </div>
        ) : (
          /* Custom School Wizard Form */
          <div className="bg-slate-850 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Configure Your School</h2>
                <p className="text-xs text-slate-400">Step 1 of 1 · Basic identity and working policies</p>
              </div>
              <button
                type="button"
                onClick={() => setSetupMode('welcome')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to options
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cambridge International Secondary"
                  className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Principal's Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Sterling"
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="United Kingdom, Nigeria, etc."
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full p-2.5 font-mono rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Term 1"
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full p-2.5 font-mono rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-2">Working Days:</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const active = workingDays.includes(d.num);
                    return (
                      <button
                        key={d.num}
                        type="button"
                        onClick={() => toggleDay(d.num)}
                        className={`px-3 py-1.5 rounded font-semibold text-xs border transition-colors ${
                          active
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSetupMode('welcome')}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors shadow-lg"
                >
                  {loading ? 'Initializing School...' : 'Launch SchoolSync'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
