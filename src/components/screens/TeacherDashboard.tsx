import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  ClipboardCheck,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Play,
  Calendar,
  Users
} from 'lucide-react';
import { User, ClassGrade, DailyRegister, Student, School } from '../../types';
import { schoolService } from '../../services/schoolService';
import { ScreenId } from '../layout/Sidebar';
import { StatusBadge } from '../common/StatusBadge';

interface TeacherDashboardProps {
  currentUser: User;
  school: School | null;
  onNavigate: (screen: ScreenId, contextClassId?: string) => void;
  currentDate: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  school,
  onNavigate,
  currentDate,
}) => {
  const [assignedClasses, setAssignedClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classRegisters, setClassRegisters] = useState<Record<string, DailyRegister>>({});
  const [classStudents, setClassStudents] = useState<Record<string, Student[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        setLoading(true);
        const allClasses = await schoolService.getClasses();
        const allTeachers = await schoolService.getTeachers();

        // Find teacher profile linked to currentUser
        const teacherProfile = allTeachers.find((t) => t.id === currentUser.teacherProfileId);
        const assignedIds = teacherProfile ? teacherProfile.assignedClassIds : [];

        // Filter to authorized assigned classes only
        const myClasses = allClasses.filter((c) => assignedIds.includes(c.id));
        setAssignedClasses(myClasses);

        const initialId = myClasses.length > 0 ? myClasses[0].id : '';
        setSelectedClassId(initialId);

        const registersMap: Record<string, DailyRegister> = {};
        const studentsMap: Record<string, Student[]> = {};

        for (const c of myClasses) {
          const reg = await schoolService.getDailyRegister(c.id, currentDate);
          const stus = await schoolService.getStudentsByClass(c.id);
          registersMap[c.id] = reg;
          studentsMap[c.id] = stus;
        }

        setClassRegisters(registersMap);
        setClassStudents(studentsMap);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [currentUser, currentDate]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-8 bg-slate-200 animate-pulse rounded w-1/3" />
        <div className="h-44 bg-slate-200 animate-pulse rounded-xl" />
      </div>
    );
  }

  const activeClass = assignedClasses.find((c) => c.id === selectedClassId) || assignedClasses[0];
  const activeRegister = activeClass ? classRegisters[activeClass.id] : undefined;
  const activeStudents = activeClass ? (classStudents[activeClass.id] || []) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header and Greeting */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Teacher Classroom Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {school?.name || 'SchoolSync'} · Faculty Member:{' '}
            <span className="font-semibold text-slate-800">{currentUser.fullName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-300 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentDate}</span>
          <span className="text-slate-400">({school?.timezone || 'Local'})</span>
        </div>
      </div>

      {assignedClasses.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No Authorized Classes Assigned</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your teacher account has not yet been assigned to any specific classes. Please contact the
            Principal to authorize your classroom schedule.
          </p>
        </div>
      ) : (
        <>
          {/* Section 2: Prominent "Start Attendance" Primary Hero Action Card */}
          <div className="bg-gradient-to-br from-[#0B192C] to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Daily Attendance Session
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Ready to take roll call?
                </h2>
                <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                  Start scanning student QR badges at your classroom door. Scans validate and save locally to IndexedDB instantly.
                </p>
              </div>

              {/* Class Selector dropdown inside primary action */}
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700 text-xs flex flex-col gap-1 min-w-[200px]">
                <label className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                  Selected Class & Section:
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-900 text-white font-bold p-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {assignedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Session Counters for the Selected Class */}
            {activeClass && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Enrolled
                  </span>
                  <span className="text-2xl font-bold font-mono text-white tabular-nums">
                    {activeStudents.length}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Learners in class</span>
                </div>

                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-800/40">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 block">
                    Marked Present
                  </span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    {activeRegister?.presentCount || 0}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block mt-0.5">Confirmed check-ins</span>
                </div>

                <div className="bg-amber-950/40 p-3.5 rounded-xl border border-amber-800/40">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                    Still Pending
                  </span>
                  <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                    {activeRegister?.pendingCount ?? activeStudents.length}
                  </span>
                  <span className="text-[10px] text-amber-300/80 block mt-0.5">Awaiting check-in</span>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Session Status
                  </span>
                  <div className="my-1">
                    <StatusBadge status={activeRegister?.status || 'not_started'} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {activeClass.roomNumber || 'Room 101'}
                  </span>
                </div>
              </div>
            )}

            {/* Primary Action Button: "Start Attendance" */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => onNavigate('qr_scanner', selectedClassId)}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Attendance (Open Camera Scanner)</span>
              </button>

              <button
                onClick={() => onNavigate('daily_register', selectedClassId)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-slate-300" />
                <span>Open Today's Register</span>
              </button>
            </div>
          </div>

          {/* Section: All Authorized Classes Roster Grid */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                All Authorized Classes ({assignedClasses.length})
              </h3>
              <span className="text-xs text-slate-500">
                Teacher faculty authorization active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedClasses.map((cls) => {
                const reg = classRegisters[cls.id];
                const students = classStudents[cls.id] || [];
                const isSelected = cls.id === selectedClassId;

                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`bg-white rounded-xl border p-5 flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">
                              {cls.name} - Section {cls.section}
                            </h4>
                            {isSelected && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                Active Choice
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cls.roomNumber || 'Main Campus'} · {students.length} Learners
                          </p>
                        </div>
                        {reg && <StatusBadge status={reg.status} size="sm" />}
                      </div>

                      {reg && (
                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono tabular-nums pt-2 border-t border-slate-100">
                          <div className="p-1.5 bg-emerald-50 rounded border border-emerald-100">
                            <span className="text-[9px] text-emerald-800 uppercase block font-sans">
                              Present
                            </span>
                            <span className="font-bold text-emerald-900">{reg.presentCount}</span>
                          </div>
                          <div className="p-1.5 bg-rose-50 rounded border border-rose-100">
                            <span className="text-[9px] text-rose-800 uppercase block font-sans">
                              Absent
                            </span>
                            <span className="font-bold text-rose-900">{reg.absentCount}</span>
                          </div>
                          <div className="p-1.5 bg-amber-50 rounded border border-amber-100">
                            <span className="text-[9px] text-amber-800 uppercase block font-sans">
                              Sick/Leave
                            </span>
                            <span className="font-bold text-amber-900">
                              {reg.sickCount + reg.leaveCount}
                            </span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-700 uppercase block font-sans">
                              Pending
                            </span>
                            <span className="font-bold text-slate-800">{reg.pendingCount}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('qr_scanner', cls.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Scan Badges</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('daily_register', cls.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>View Register</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
