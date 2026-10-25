import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Edit2,
  ArrowRightLeft,
  ShieldAlert,
  QrCode,
  User,
  Phone,
  Calendar,
  GraduationCap,
  HeartPulse,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Award
} from 'lucide-react';
import { Student, School, ClassGrade, User as AppUser, AttendanceRecord } from '../../types';
import { schoolService } from '../../services/schoolService';
import { QRCodeView } from './QRCodeView';

interface StudentDetailsModalProps {
  student: Student;
  school: School | null;
  classGrade?: ClassGrade;
  classes: ClassGrade[];
  currentUser: AppUser;
  onClose: () => void;
  onPrintCard: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onTransferStudent?: (student: Student) => void;
  onRevokeCredential?: (student: Student) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  school,
  classGrade,
  classes,
  currentUser,
  onClose,
  onPrintCard,
  onEditStudent,
  onTransferStudent,
  onRevokeCredential,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'credential' | 'attendance'>('profile');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const activeClass = classGrade || classes.find((c) => c.id === student.classId);
  const classNameStr = activeClass ? `${activeClass.name} - Section ${activeClass.section}` : `Class ${student.classId}`;
  const formattedRoll = String(student.rollNumber).padStart(4, '0');

  useEffect(() => {
    let isMounted = true;
    schoolService
      .getAttendanceForStudent(student.id)
      .then((records) => {
        if (isMounted) {
          setAttendanceRecords(records);
          setLoadingAttendance(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingAttendance(false);
      });

    return () => {
      isMounted = false;
    };
  }, [student.id]);

  // Attendance stats computation
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
  const absentDays = attendanceRecords.filter((r) => r.status === 'absent').length;
  const leaveDays = attendanceRecords.filter((r) => r.status === 'sick_leave' || r.status === 'approved_leave').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Hero Banner */}
        <div className="bg-[#0B192C] text-white p-5 sm:p-6 relative border-b-2 border-emerald-500 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Student Avatar / Photo */}
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-emerald-500 p-0.5 overflow-hidden shadow-lg shrink-0 flex items-center justify-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Student Titles & Badges */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-mono font-bold tracking-wider">
                  ROLL {formattedRoll}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    student.enrollmentStatus === 'active'
                      ? 'bg-emerald-600 text-white'
                      : student.enrollmentStatus === 'transferred'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-600 text-white'
                  }`}
                >
                  {student.enrollmentStatus}
                </span>
                {student.admissionNumber && (
                  <span className="text-[11px] font-mono text-slate-300">
                    Adm: {student.admissionNumber}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1.5 truncate">
                {student.fullName}
              </h2>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>{classNameStr}</span>
                <span className="text-slate-400 font-normal">· {school?.name || 'SchoolSync Academy'}</span>
              </p>
            </div>
          </div>

          {/* Primary Action Button: Prominent PRINT ID CARD */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Registered Learner Credential</span>
            </div>

            <div className="flex items-center gap-2">
              {/* THE PROMINENT 'PRINT ID CARD' BUTTON */}
              <button
                type="button"
                onClick={() => onPrintCard(student)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print ID Card</span>
              </button>

              {currentUser.role === 'principal' && onEditStudent && (
                <button
                  type="button"
                  onClick={() => onEditStudent(student)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Student Profile
          </button>
          <button
            onClick={() => setActiveTab('credential')}
            className={`py-3 px-4 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'credential'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ID Card & QR Badge</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'attendance'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance History ({attendanceRecords.length})</span>
          </button>
        </div>

        {/* Modal Body: Active Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
          
          {/* TAB 1: Profile & Demographics */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Identity & Academic Info Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Academic & Enrollment Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Roll Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formattedRoll}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Class & Section</span>
                    <span className="font-semibold text-slate-900">{classNameStr}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Admission Number</span>
                    <span className="font-mono text-slate-900">{student.admissionNumber || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Admission</span>
                    <span className="font-mono text-slate-900">{student.admissionDate || 'Standard Term Intake'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Gender</span>
                    <span className="capitalize font-semibold text-slate-900">{student.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Current Enrollment Status</span>
                    <span className="capitalize font-semibold text-emerald-700">{student.enrollmentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Guardian & Contact Information */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Guardian & Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Father / Primary Guardian</span>
                    <span className="font-bold text-slate-900">{student.guardianName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Guardian Phone Contact</span>
                    {student.guardianPhone ? (
                      <a
                        href={`tel:${student.guardianPhone}`}
                        className="font-mono font-semibold text-emerald-700 hover:underline flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{student.guardianPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">No phone provided</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                    <span className="font-mono text-slate-900">{student.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Blood Group</span>
                    <span className="font-bold text-rose-700">{student.bloodGroup || '—'}</span>
                  </div>
                  {student.address && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Residential Address</span>
                      <span className="text-slate-800">{student.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Administrative Actions */}
              {currentUser.role === 'principal' && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {onTransferStudent && (
                    <button
                      type="button"
                      onClick={() => onTransferStudent(student)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-sky-800 rounded-lg border border-sky-300 font-semibold transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                      <span>Transfer to Another Class</span>
                    </button>
                  )}

                  {onRevokeCredential && (
                    <button
                      type="button"
                      onClick={() => onRevokeCredential(student)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-amber-900 rounded-lg border border-amber-300 font-semibold transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Revoke Lost Card & Issue New</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Credential & QR Badge */}
          {activeTab === 'credential' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                {/* QR Code Canvas */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center shrink-0">
                  <QRCodeView value={student.qrCodeToken} size={110} />
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1 font-bold">
                    Official Scan Pass
                  </span>
                </div>

                {/* Credential Details */}
                <div className="space-y-2 flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-[10px] uppercase">
                      Active Credential
                    </span>
                    <span className="text-[10px] text-slate-500">Version 1.0</span>
                  </div>

                  <p className="font-mono text-xs text-slate-900 font-bold truncate">
                    CID: {student.activeCredentialId || formattedRoll}
                  </p>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    This encrypted token encodes the student ID and credential authorization. It decodes instantly offline with camera scanning and rejects revoked or duplicate cards.
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPrintCard(student)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Open ID Card Print Studio</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Revocation History */}
              {student.revokedCredentialIds && student.revokedCredentialIds.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Revoked Credentials History ({student.revokedCredentialIds.length})</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    The following card credentials were reported lost or damaged and have been permanently blacklisted:
                  </p>
                  <ul className="space-y-1">
                    {student.revokedCredentialIds.map((cid, i) => (
                      <li key={i} className="font-mono text-[10px] text-amber-900 bg-white/70 px-2.5 py-1 rounded border border-amber-300">
                        Revoked CID #{i + 1}: {cid}
                      </li>
                    ))}
                  </ul>
                  {student.lastReplacedReason && (
                    <p className="text-[10px] text-amber-800 pt-1">
                      <strong>Audit Log:</strong> {student.lastReplacedReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Attendance History & Stats */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Days</span>
                  <span className="text-base font-bold text-slate-900 font-mono">{totalDays}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Present</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">{presentDays}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-800 uppercase font-semibold block">Absent</span>
                  <span className="text-base font-bold text-rose-800 font-mono">{absentDays}</span>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                  <span className="text-[10px] text-sky-800 uppercase font-semibold block">Rate</span>
                  <span className="text-base font-bold text-sky-900 font-mono">{attendanceRate}%</span>
                </div>
              </div>

              {/* Records List */}
              {loadingAttendance ? (
                <div className="p-8 text-center text-slate-400">Loading attendance history...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No attendance records logged yet for this student.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Marked By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {attendanceRecords.slice(0, 15).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-medium text-slate-800">{rec.date}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded font-bold capitalize text-[10px] ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 capitalize">
                            {rec.method ? rec.method.replace('_', ' ') : 'manual'}
                          </td>
                          <td className="p-2.5 text-slate-600">{rec.markedByName || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-[11px] text-slate-500">
            Internal ID: <span className="font-mono">{student.id.substring(0, 12)}...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold border border-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onPrintCard(student)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print ID Card</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
