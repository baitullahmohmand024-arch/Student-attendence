import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { DailyRegister, AttendanceRecord, ClassGrade, User, AttendanceStatus } from '../../types';
import { schoolService } from '../../services/schoolService';
import { StatusBadge } from '../common/StatusBadge';

interface LeaveCorrectionsScreenProps {
  currentUser: User;
  currentDate: string;
  onNavigateToRegister?: (classId: string) => void;
}

export const LeaveCorrectionsScreen: React.FC<LeaveCorrectionsScreenProps> = ({
  currentUser,
  currentDate,
  onNavigateToRegister,
}) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [submittedRegisters, setSubmittedRegisters] = useState<DailyRegister[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Correction Modal
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [auditReason, setAuditReason] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const allClasses = await schoolService.getClasses();
      setClasses(allClasses);

      // Check registers for today across all classes
      const registers: DailyRegister[] = [];
      for (const c of allClasses) {
        const reg = await schoolService.getDailyRegister(c.id, currentDate);
        if (reg.status === 'submitted' || reg.status === 'correction_required') {
          registers.push(reg);
        }
      }
      setSubmittedRegisters(registers);

      // Fetch all attendance records with sick_leave, approved_leave or recent audit corrections
      const allAttendance = await schoolService.getAttendanceForClassAndDate(
        allClasses[0]?.id || '',
        currentDate
      );
      // Let's get leaves across all classes for today
      const classLeaves: AttendanceRecord[] = [];
      for (const c of allClasses) {
        const recs = await schoolService.getAttendanceForClassAndDate(c.id, currentDate);
        recs
          .filter((r) => r.status === 'sick_leave' || r.status === 'approved_leave' || r.auditReason)
          .forEach((r) => classLeaves.push(r));
      }
      setLeaveRecords(classLeaves);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const handleAuthorizeFinalize = async (classId: string) => {
    try {
      setErrorMessage(null);
      await schoolService.finalizeRegister(classId, currentDate);
      setSuccessMessage('Register verified and finalized.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setErrorMessage(message);
    }
  };

  const handleOpenCorrection = (rec: AttendanceRecord) => {
    setCorrectingRecord(rec);
    setNewStatus(rec.status);
    setAuditReason('');
    setNewRemarks(rec.remarks || '');
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    if (!auditReason.trim()) {
      setErrorMessage('An audit reason is strictly mandatory for attendance corrections.');
      return;
    }

    try {
      setErrorMessage(null);
      await schoolService.correctAttendanceWithAudit({
        recordId: correctingRecord.id,
        newStatus,
        auditReason: auditReason.trim(),
        remarks: newRemarks.trim() || undefined,
      });

      setSuccessMessage(`Attendance corrected for ${correctingRecord.studentName}.`);
      setCorrectingRecord(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Correction failed';
      setErrorMessage(message);
    }
  };

  const getClassName = (classId: string) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} - ${c.section}` : classId;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Leave & Attendance Correction Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review teacher submissions, verify documented medical / family leaves, and authorize traceable corrections.
        </p>
      </div>

      {/* Messages */}
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

      {/* Section 1: Registers Awaiting Principal Verification */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Registers Awaiting Principal Review ({submittedRegisters.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Date: {currentDate}</span>
        </div>

        {submittedRegisters.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-xs text-slate-500">
            All submitted class registers for today have been reviewed and finalized, or none submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittedRegisters.map((reg) => (
              <div
                key={reg.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {getClassName(reg.classId)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submitted by: <span className="font-medium text-slate-700">{reg.submittedByName || 'Teacher'}</span>
                      </p>
                    </div>
                    <StatusBadge status={reg.status} />
                  </div>

                  <div className="grid grid-cols-4 gap-2 my-3 text-center text-xs font-mono tabular-nums">
                    <div className="p-1.5 bg-emerald-50 rounded border border-emerald-100">
                      <span className="text-[10px] text-emerald-800 uppercase block font-sans">Present</span>
                      <span className="font-bold text-emerald-900">{reg.presentCount}</span>
                    </div>
                    <div className="p-1.5 bg-rose-50 rounded border border-rose-100">
                      <span className="text-[10px] text-rose-800 uppercase block font-sans">Absent</span>
                      <span className="font-bold text-rose-900">{reg.absentCount}</span>
                    </div>
                    <div className="p-1.5 bg-amber-50 rounded border border-amber-100">
                      <span className="text-[10px] text-amber-800 uppercase block font-sans">Sick</span>
                      <span className="font-bold text-amber-900">{reg.sickCount}</span>
                    </div>
                    <div className="p-1.5 bg-sky-50 rounded border border-sky-100">
                      <span className="text-[10px] text-sky-800 uppercase block font-sans">Leave</span>
                      <span className="font-bold text-sky-900">{reg.leaveCount}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                  {onNavigateToRegister && (
                    <button
                      onClick={() => onNavigateToRegister(reg.classId)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded font-medium text-slate-700"
                    >
                      Inspect Entries
                    </button>
                  )}
                  {currentUser.role === 'principal' && (
                    <button
                      onClick={() => handleAuthorizeFinalize(reg.classId)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold transition-colors"
                    >
                      Approve & Finalize
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Documented Student Leaves & Audited Entries */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-emerald-700" />
          <span>Documented Student Leaves & Audited Records ({leaveRecords.length})</span>
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {leaveRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No medical sick leaves or authorized absences recorded for {currentDate}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Roll</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Recorded Reason / Notes</th>
                    <th className="py-2.5 px-4">Audit Note</th>
                    <th className="py-2.5 px-4 text-right">Correct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {getClassName(r.classId)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                        {r.studentRollNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {r.remarks || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="py-3 px-4 text-amber-800 text-[11px] max-w-xs">
                        {r.auditReason ? `Audited: "${r.auditReason}"` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenCorrection(r)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Authorized Correction Modal */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Authorize Attendance Correction
              </h3>
              <button
                onClick={() => setCorrectingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Adjusting status for <span className="font-semibold text-slate-900">{correctingRecord.studentName}</span> (
                Roll: {correctingRecord.studentRollNumber}) on {currentDate}.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full p-2 rounded border border-slate-300 bg-white capitalize"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="approved_leave">Approved Leave</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Required Audit Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g. Medical certificate verified by Principal; or Late arrival rectified."
                  className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Updated Reason / Remark Note
                </label>
                <input
                  type="text"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="Optional detail"
                  className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold transition-colors"
                >
                  Save Audited Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
