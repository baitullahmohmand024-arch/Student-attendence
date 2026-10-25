import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  X,
  Thermometer,
  ShieldAlert,
  Clock,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Search,
  CheckCheck,
} from 'lucide-react';
import {
  ClassGrade,
  DailyRegister,
  AttendanceRecord,
  AttendanceStatus,
  User,
  School,
  Student
} from '../../types';
import { Camera } from 'lucide-react';
import { schoolService } from '../../services/schoolService';
import { StatusBadge } from '../common/StatusBadge';

interface DailyRegisterScreenProps {
  currentUser: User;
  school: School | null;
  currentDate: string;
  initialClassId?: string;
  onOpenScanner?: (classId: string) => void;
}

export const DailyRegisterScreen: React.FC<DailyRegisterScreenProps> = ({
  currentUser,
  school,
  currentDate,
  initialClassId,
  onOpenScanner,
}) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);
  const [register, setRegister] = useState<DailyRegister | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Remarks / Leave Reason Dialog
  const [activeRemarkRecord, setActiveRemarkRecord] = useState<AttendanceRecord | null>(null);
  const [remarkText, setRemarkText] = useState('');

  // Reopen Register Dialog
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Load classes based on user role (teacher sees only assigned classes, principal sees all)
  useEffect(() => {
    const loadClasses = async () => {
      const allClasses = await schoolService.getClasses();
      let accessible = allClasses;

      if (currentUser.role === 'teacher') {
        const teachers = await schoolService.getTeachers();
        const teacherProfile = teachers.find((t) => t.id === currentUser.teacherProfileId);
        const assignedIds = teacherProfile ? teacherProfile.assignedClassIds : [];
        accessible = allClasses.filter((c) => assignedIds.includes(c.id));
      }

      setClasses(accessible);
      if (initialClassId && accessible.some((c) => c.id === initialClassId)) {
        setSelectedClassId(initialClassId);
      } else if (accessible.length > 0) {
        setSelectedClassId(accessible[0].id);
      }
    };

    loadClasses();
  }, [currentUser, initialClassId]);

  // Load Register, Attendance Records, and Student Details for selected class and date
  const loadRegisterAndAttendance = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const [reg, attRecords, classStudents] = await Promise.all([
        schoolService.getDailyRegister(selectedClassId, selectedDate),
        schoolService.getAttendanceForClassAndDate(selectedClassId, selectedDate),
        schoolService.getStudentsByClass(selectedClassId),
      ]);
      setRegister(reg);
      setRecords(attRecords);

      const map: Record<string, Student> = {};
      classStudents.forEach((s) => {
        map[s.id] = s;
      });
      setStudentsMap(map);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load register.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadRegisterAndAttendance();
    }
  }, [selectedClassId, selectedDate]);

  // Status marking handler
  const handleSetStatus = async (
    record: AttendanceRecord,
    newStatus: AttendanceStatus,
    promptRemarks = false
  ) => {
    if (isLocked) {
      setErrorMessage('This register is finalized. To make adjustments, an authorized Principal must reopen it.');
      return;
    }

    if (promptRemarks || newStatus === 'sick_leave' || newStatus === 'approved_leave') {
      setActiveRemarkRecord(record);
      setRemarkText(record.remarks || '');
      return;
    }

    try {
      setErrorMessage(null);
      await schoolService.markAttendance({
        studentId: record.studentId,
        classId: selectedClassId,
        date: selectedDate,
        status: newStatus,
        method: 'manual_entry',
      });
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating attendance';
      setErrorMessage(message);
    }
  };

  const handleSaveRemark = async (statusOverride?: AttendanceStatus) => {
    if (!activeRemarkRecord) return;
    try {
      setErrorMessage(null);
      await schoolService.markAttendance({
        studentId: activeRemarkRecord.studentId,
        classId: selectedClassId,
        date: selectedDate,
        status: statusOverride || activeRemarkRecord.status,
        method: 'manual_entry',
        remarks: remarkText.trim() || undefined,
      });
      setActiveRemarkRecord(null);
      setRemarkText('');
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving remarks';
      setErrorMessage(message);
    }
  };

  // Bulk actions
  const handleBulkMark = async (status: AttendanceStatus, pendingOnly = false) => {
    if (isLocked) return;
    try {
      setErrorMessage(null);
      await schoolService.bulkMarkAttendance(
        selectedClassId,
        selectedDate,
        status,
        pendingOnly ? 'pending_only' : 'all'
      );
      setSuccessMessage(`Attendance bulk updated to "${status}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bulk action failed';
      setErrorMessage(message);
    }
  };

  // Submit register
  const handleSubmitRegister = async () => {
    try {
      setErrorMessage(null);
      await schoolService.submitRegister(selectedClassId, selectedDate);
      setSuccessMessage('Daily register successfully submitted for Principal review.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setErrorMessage(message);
    }
  };

  // Finalize register (Principal)
  const handleFinalizeRegister = async () => {
    try {
      setErrorMessage(null);
      await schoolService.finalizeRegister(selectedClassId, selectedDate);
      setSuccessMessage('Daily register finalized and locked.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Finalization failed';
      setErrorMessage(message);
    }
  };

  // Reopen register (Principal)
  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      setErrorMessage('An audit reason is required to reopen a finalized register.');
      return;
    }
    try {
      setErrorMessage(null);
      await schoolService.reopenRegister(selectedClassId, selectedDate, reopenReason);
      setShowReopenModal(false);
      setReopenReason('');
      setSuccessMessage('Register reopened for corrections. Reason recorded in audit log.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadRegisterAndAttendance();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reopen failed';
      setErrorMessage(message);
    }
  };

  const isLocked = register?.status === 'finalized' && currentUser.role !== 'principal';
  const isFinalized = register?.status === 'finalized';
  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentRollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
              {school?.name || 'SchoolSync'}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ATTENDANCE REGISTER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {currentClass ? `${currentClass.name} — Section ${currentClass.section}` : 'Daily Register'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} · Academic Year {school?.academicYear || 'Current'}
          </p>
        </div>

        {/* Class and Date Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs shadow-sm">
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Section {c.section}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-mono text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          {onOpenScanner && selectedClassId && (
            <button
              onClick={() => onOpenScanner(selectedClassId)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR Badges</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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
            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Register Overview Status Bar */}
      {register && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Register Status:
                </span>
                <StatusBadge status={register.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentClass?.name} - {currentClass?.section} · Total Enrolled: {register.totalStudents}
              </p>
            </div>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              <span className="font-semibold text-emerald-950 font-sans mr-1">Present:</span>
              <span className="font-bold">{register.presentCount}</span>
            </div>
            <div className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded border border-rose-200">
              <span className="font-semibold text-rose-950 font-sans mr-1">Absent:</span>
              <span className="font-bold">{register.absentCount}</span>
            </div>
            <div className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
              <span className="font-semibold text-amber-950 font-sans mr-1">Sick/Leave:</span>
              <span className="font-bold">{register.sickCount + register.leaveCount}</span>
            </div>
            <div className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-300">
              <span className="font-semibold text-slate-900 font-sans mr-1">Pending:</span>
              <span className="font-bold">{register.pendingCount}</span>
            </div>
          </div>

          {/* Submission and Finalization Buttons */}
          <div className="flex items-center gap-2">
            {!isFinalized && register.status !== 'submitted' && (
              <button
                onClick={handleSubmitRegister}
                disabled={register.pendingCount > 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  register.pendingCount > 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={
                  register.pendingCount > 0
                    ? 'All students must be resolved before submitting.'
                    : 'Submit register for Principal review'
                }
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Principal</span>
              </button>
            )}

            {currentUser.role === 'principal' && !isFinalized && (
              <button
                onClick={handleFinalizeRegister}
                disabled={register.pendingCount > 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  register.pendingCount > 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title="Finalize and lock this register"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalize Register</span>
              </button>
            )}

            {currentUser.role === 'principal' && isFinalized && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 text-xs font-semibold transition-colors"
                title="Reopen finalized register with audit reason"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                <span>Reopen Register</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Bar: Search, Filters, and Bulk Mark */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded border border-slate-300 focus:outline-none focus:border-slate-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
            <option value="sick_leave">Sick Leave</option>
            <option value="approved_leave">Approved Leave</option>
          </select>
        </div>

        {/* Quick Bulk Marking Controls */}
        {!isLocked && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden md:inline">Bulk:</span>
            <button
              onClick={() => handleBulkMark('present', true)}
              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium transition-colors"
              title="Mark all students currently 'Pending' as Present"
            >
              Pending → Present
            </button>
            <button
              onClick={() => handleBulkMark('absent', true)}
              className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-medium transition-colors"
              title="Mark all students currently 'Pending' as Absent"
            >
              Pending → Absent
            </button>
            <button
              onClick={() => handleBulkMark('present', false)}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition-colors"
              title="Reset all students in class to Present"
            >
              All Present
            </button>
          </div>
        )}
      </div>

      {/* Roster Attendance Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading student roster...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No students found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-20">Roll No</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Father's / Guardian's Name</th>
                  <th className="py-2.5 px-4 w-36">Today's Status</th>
                  <th className="py-2.5 px-4 w-32">Method</th>
                  <th className="py-2.5 px-4">Remarks / Leave Note</th>
                  <th className="py-2.5 px-4 text-right w-64">Attendance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec) => {
                  const isPending = rec.status === 'pending';
                  const isPresent = rec.status === 'present';
                  const isAbsent = rec.status === 'absent';
                  const isSick = rec.status === 'sick_leave';
                  const isLeave = rec.status === 'approved_leave';
                  const guardianName = studentsMap[rec.studentId]?.guardianName || rec.guardianName || '—';
                  const formattedRoll = rec.studentRollNumber
                    ? String(rec.studentRollNumber).padStart(2, '0')
                    : '--';

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {formattedRoll}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{rec.studentName}</span>
                        {rec.auditReason && (
                          <span className="text-[10px] text-amber-700 block mt-0.5">
                            Audited: {rec.auditReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {guardianName}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={rec.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {rec.method === 'qr_scan' ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            QR Scan
                          </span>
                        ) : rec.method === 'manual_entry' ? (
                          <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Manual</span>
                        ) : rec.method === 'bulk_mark' ? (
                          <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Bulk</span>
                        ) : (
                          <span className="text-slate-400">Not Marked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {rec.remarks ? (
                          <span className="italic text-[11px]">{rec.remarks}</span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveRemarkRecord(rec);
                              setRemarkText('');
                            }}
                            disabled={isLocked}
                            className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Add remark</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSetStatus(rec, 'present')}
                            disabled={isLocked}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900'
                            }`}
                            title="Mark Present"
                          >
                            P
                          </button>
                          <button
                            onClick={() => handleSetStatus(rec, 'absent')}
                            disabled={isLocked}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900'
                            }`}
                            title="Mark Absent"
                          >
                            A
                          </button>
                          <button
                            onClick={() => handleSetStatus(rec, 'sick_leave', true)}
                            disabled={isLocked}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              isSick
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900'
                            }`}
                            title="Mark Sick Leave"
                          >
                            S
                          </button>
                          <button
                            onClick={() => handleSetStatus(rec, 'approved_leave', true)}
                            disabled={isLocked}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              isLeave
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-900'
                            }`}
                            title="Mark Approved Leave"
                          >
                            L
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remark / Leave Dialog Modal */}
      {activeRemarkRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Attendance Note & Leave Details
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Student: <span className="font-semibold text-slate-800">{activeRemarkRecord.studentName}</span> (
                Roll: {activeRemarkRecord.studentRollNumber})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 block">
                Select Status for this entry:
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(['present', 'absent', 'sick_leave', 'approved_leave'] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleSaveRemark(st)}
                    className="p-2 rounded border border-slate-300 hover:border-slate-900 text-center font-medium capitalize"
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">
                Reason or Administrative Remark:
              </label>
              <textarea
                rows={3}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="e.g. Mild fever, guardian phoned at 08:15; or Approved family leave."
                className="w-full p-2.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setActiveRemarkRecord(null);
                  setRemarkText('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRemark()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Register Audit Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Authorize Register Reopening</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This register was officially finalized. Reopening unlocks ordinary editing and logs an immutable audit event under your principal account.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Required Audit Justification:
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Correction of late student arrival after train delay."
                className="w-full p-2.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReopen}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
              >
                Confirm & Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
