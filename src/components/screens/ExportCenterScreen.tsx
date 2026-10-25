import React, { useState, useEffect } from 'react';
import {
  FileDown,
  Printer,
  QrCode,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  Users
} from 'lucide-react';
import { School, ClassGrade, Student, AttendanceRecord, User } from '../../types';
import { schoolService } from '../../services/schoolService';
import { QRCodeView } from '../common/QRCodeView';
import { StudentIDCard } from '../common/StudentIDCard';

interface ExportCenterScreenProps {
  school: School | null;
  currentUser: User;
  currentDate: string;
}

export const ExportCenterScreen: React.FC<ExportCenterScreenProps> = ({
  school,
  currentUser,
  currentDate,
}) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [activePrintMode, setActivePrintMode] = useState<'none' | 'qr_badges' | 'daily_sheet' | 'student_roster'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allClasses = await schoolService.getClasses();
        setClasses(allClasses);
        if (allClasses.length > 0) {
          setSelectedClassId(allClasses[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const loadClassDetails = async () => {
      const [stus, atts] = await Promise.all([
        schoolService.getStudentsByClass(selectedClassId),
        schoolService.getAttendanceForClassAndDate(selectedClassId, currentDate),
      ]);
      setStudents(stus);
      setAttendanceRecords(atts);
    };
    loadClassDetails();
  }, [selectedClassId, currentDate]);

  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Trigger print view
  const triggerPrint = (mode: 'qr_badges' | 'daily_sheet' | 'student_roster') => {
    setActivePrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // CSV Exporters
  const downloadAttendanceCSV = () => {
    const headers = ['RollNumber', 'StudentName', 'Class', 'Date', 'Status', 'Method', 'Remarks'];
    const rows = attendanceRecords.map((r) => [
      `"${r.studentRollNumber}"`,
      `"${r.studentName}"`,
      `"${currentClass?.name || ''} - ${currentClass?.section || ''}"`,
      r.date,
      r.status,
      r.method,
      `"${r.remarks || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_${currentClass?.name || 'class'}_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentRosterCSV = () => {
    const headers = ['RollNumber', 'FullName', 'Gender', 'GuardianName', 'GuardianPhone', 'AdmissionNumber', 'QRToken'];
    const rows = students.map((s) => [
      `"${s.rollNumber}"`,
      `"${s.fullName}"`,
      s.gender,
      `"${s.guardianName}"`,
      `"${s.guardianPhone}"`,
      `"${s.admissionNumber || ''}"`,
      `"${s.qrCodeToken}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students_${currentClass?.name || 'class'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Interactive Screen controls (hidden in print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Print & Export Documentation Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Generate printable official registers, student QR passes, and validated CSV datasets.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
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
        </div>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Student QR Badges */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Printable Student QR Passes</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Generates a printable 3-column sheet of durable ID cards featuring the student name, roll number, and scannable QR verification code.
              </p>
            </div>

            <button
              onClick={() => triggerPrint('qr_badges')}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print QR Passes ({students.length})</span>
            </button>
          </div>

          {/* Card 2: Daily Attendance Sheet */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Official Daily Register Slip</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Formatted daily attendance register with room for teacher sign-off, principal certification stamp, and marked status codes for {currentDate}.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => triggerPrint('daily_sheet')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Official Sheet</span>
              </button>
              <button
                onClick={downloadAttendanceCSV}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>Download CSV Data</span>
              </button>
            </div>
          </div>

          {/* Card 3: Class Student Roster */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Student Enrollment Roster</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete class directory with student roll numbers, guardian emergency phone numbers, and admission references.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => triggerPrint('student_roster')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Roster List</span>
              </button>
              <button
                onClick={downloadStudentRosterCSV}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Roster CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRINT TEMPLATES (Rendered during window.print()) --- */}

      {/* 1. Student QR Badges Print Template */}
      <div className={`print-only ${activePrintMode === 'qr_badges' ? 'block' : 'hidden'}`}>
        <div className="p-4 border-b border-slate-800 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{school?.name}</h1>
            <p className="text-xs text-slate-600">
              Student Attendance QR Verification Badges · Class: {currentClass?.name} - {currentClass?.section}
            </p>
          </div>
          <span className="font-mono text-xs">{school?.academicYear}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center justify-items-center">
          {students.map((st) => (
            <div
              key={st.id}
              className="p-1 rounded border border-dashed border-slate-300 print-break-inside-avoid bg-white"
            >
              <StudentIDCard
                student={st}
                school={school}
                classGrade={currentClass}
                layout="horizontal"
                isPrintPreview
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Official Daily Register Print Template */}
      <div className={`print-only ${activePrintMode === 'daily_sheet' ? 'block' : 'hidden'}`}>
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">{school?.name}</h1>
            <h2 className="text-sm font-semibold">Official Daily Attendance Register</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Class: {currentClass?.name} - Section {currentClass?.section} · Date: {currentDate}
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p>Principal: {school?.principalName}</p>
            <p>Academic Year: {school?.academicYear}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs border border-slate-800">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-100 font-bold">
              <th className="p-2 border-r border-slate-800 w-16">Roll No</th>
              <th className="p-2 border-r border-slate-800">Student Name</th>
              <th className="p-2 border-r border-slate-800 w-24">Status</th>
              <th className="p-2 border-r border-slate-800 w-24">Method</th>
              <th className="p-2">Remarks / Authorization Note</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((r) => (
              <tr key={r.id} className="border-b border-slate-300">
                <td className="p-2 border-r border-slate-800 font-mono font-bold">
                  {r.studentRollNumber}
                </td>
                <td className="p-2 border-r border-slate-800 font-semibold">{r.studentName}</td>
                <td className="p-2 border-r border-slate-800 uppercase font-mono font-bold">
                  {r.status.replace('_', ' ')}
                </td>
                <td className="p-2 border-r border-slate-800 font-mono text-[11px]">{r.method}</td>
                <td className="p-2 text-[11px]">{r.remarks || r.auditReason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 flex justify-between text-xs font-semibold print-break-inside-avoid">
          <div className="border-t border-slate-800 pt-2 w-48 text-center">
            Class Teacher Signature
          </div>
          <div className="border-t border-slate-800 pt-2 w-48 text-center">
            Principal Stamp & Sign-off
          </div>
        </div>
      </div>

      {/* 3. Class Roster Print Template */}
      <div className={`print-only ${activePrintMode === 'student_roster' ? 'block' : 'hidden'}`}>
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold uppercase">{school?.name}</h1>
            <h2 className="text-sm font-semibold">Student Enrollment Directory</h2>
            <p className="text-xs text-slate-600">
              Class: {currentClass?.name} - {currentClass?.section} · Total: {students.length}
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p>Printed: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs border border-slate-800">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-100 font-bold">
              <th className="p-2 border-r border-slate-800 w-16">Roll</th>
              <th className="p-2 border-r border-slate-800">Full Name</th>
              <th className="p-2 border-r border-slate-800 w-20">Gender</th>
              <th className="p-2 border-r border-slate-800">Guardian Name</th>
              <th className="p-2 border-r border-slate-800">Guardian Contact</th>
              <th className="p-2">Admission No</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.id} className="border-b border-slate-300">
                <td className="p-2 border-r border-slate-800 font-mono font-bold">{st.rollNumber}</td>
                <td className="p-2 border-r border-slate-800 font-semibold">{st.fullName}</td>
                <td className="p-2 border-r border-slate-800 capitalize">{st.gender}</td>
                <td className="p-2 border-r border-slate-800">{st.guardianName}</td>
                <td className="p-2 border-r border-slate-800 font-mono">{st.guardianPhone}</td>
                <td className="p-2 font-mono">{st.admissionNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
