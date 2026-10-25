import React, { useState, useEffect } from 'react';
import {
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  X
} from 'lucide-react';
import { School, User } from '../../types';
import { schoolService } from '../../services/schoolService';

interface SchoolSettingsScreenProps {
  school: School | null;
  currentUser: User;
  onSchoolUpdated: (updatedSchool: School) => void;
}

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
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

export const SchoolSettingsScreen: React.FC<SchoolSettingsScreenProps> = ({
  school,
  currentUser,
  onSchoolUpdated,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [term, setTerm] = useState('Term 1');
  const [principalName, setPrincipalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cutOffTime, setCutOffTime] = useState('08:30');
  const [requireLeaveReason, setRequireLeaveReason] = useState(true);
  const [allowTeacherCorrectionBeforeFinalize, setAllowTeacherCorrectionBeforeFinalize] = useState(true);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (school) {
      setName(school.name);
      setCode(school.code || '');
      setCountry(school.country);
      setTimezone(school.timezone);
      setAcademicYear(school.academicYear);
      setTerm(school.term);
      setPrincipalName(school.principalName);
      setContactEmail(school.contactEmail || '');
      setContactPhone(school.contactPhone || '');
      setAddress(school.address || '');
      setCutOffTime(school.preferences?.cutOffTime || '08:30');
      setRequireLeaveReason(school.preferences?.requireLeaveReason ?? true);
      setAllowTeacherCorrectionBeforeFinalize(
        school.preferences?.allowTeacherCorrectionBeforeFinalize ?? true
      );
      setWorkingDays(school.workingDays || [1, 2, 3, 4, 5]);
    }
  }, [school]);

  const toggleDay = (dayNum: number) => {
    if (workingDays.includes(dayNum)) {
      if (workingDays.length <= 1) {
        setErrorMessage('At least one school working day must remain active.');
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== dayNum));
    } else {
      setWorkingDays([...workingDays, dayNum].sort());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('School name is required.');
      return;
    }
    if (!principalName.trim()) {
      setErrorMessage("Principal's name is required.");
      return;
    }

    try {
      setSaving(true);
      const updated = await schoolService.updateSchool({
        name: name.trim(),
        code: code.trim() || undefined,
        country: country.trim(),
        timezone,
        academicYear: academicYear.trim(),
        term: term.trim(),
        principalName: principalName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        workingDays,
        preferences: {
          cutOffTime,
          requireLeaveReason,
          allowTeacherCorrectionBeforeFinalize,
          defaultStatus: 'pending',
          lateGraceMinutes: 15,
        },
      });

      onSchoolUpdated(updated);
      setSuccessMessage('School identity & preferences saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setErrorMessage(message);
    } finally {
      setSaving(false);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          School Identity & Attendance Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Global academic policies, working calendar, timezone rules, and administrative profiles.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: School Profile */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <span>Institutional Identity</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Official School Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Greenwood International School"
                className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                School Registration Code / Center No.
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SCH-904"
                className="w-full p-2 font-mono uppercase rounded border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Principal's Full Name *
              </label>
              <input
                type="text"
                required
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="e.g. Dr. Arthur Sterling"
                className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United Kingdom, Nigeria, India, etc."
                className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="principal@school.edu"
                className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 20 7946 0912"
                className="w-full p-2 font-mono rounded border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Campus Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical location"
              className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        {/* Section 2: Calendar, Timezone & Working Days */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Academic Calendar & Working Schedule</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full p-2 font-mono rounded border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Academic Term / Semester</label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Term 1"
                className="w-full p-2 rounded border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">School Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 bg-white font-mono"
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
            <label className="font-semibold text-slate-700 block mb-2">
              Scheduled School Working Days:
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const isActive = workingDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-4 py-2 rounded font-semibold text-xs transition-colors border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Attendance matrices and session counters will treat unselected days as non-working days.
            </p>
          </div>
        </div>

        {/* Section 3: Attendance Policies */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Attendance Policies & Strictness</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Daily Roll Call Cut-off</label>
              <input
                type="time"
                value={cutOffTime}
                onChange={(e) => setCutOffTime(e.target.value)}
                className="w-full p-2 font-mono rounded border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={requireLeaveReason}
                onChange={(e) => setRequireLeaveReason(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-slate-800 font-medium">
                Require written reason / guardian contact note for Sick and Approved Leave entries
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowTeacherCorrectionBeforeFinalize}
                onChange={(e) => setAllowTeacherCorrectionBeforeFinalize(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-slate-800 font-medium">
                Allow classroom teachers to modify marked entries prior to register submission
              </span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{saving ? 'Saving...' : 'Save School Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
