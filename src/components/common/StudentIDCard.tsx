import React from 'react';
import { School, Student, ClassGrade } from '../../types';
import { QRCodeView } from './QRCodeView';
import { ShieldCheck, User } from 'lucide-react';

interface StudentIDCardProps {
  student: Student;
  school: School | null;
  classGrade?: ClassGrade;
  layout?: 'horizontal' | 'vertical';
  showGuardian?: boolean;
  showAdmission?: boolean;
  className?: string;
  isPrintPreview?: boolean;
}

export const StudentIDCard: React.FC<StudentIDCardProps> = ({
  student,
  school,
  classGrade,
  layout = 'horizontal',
  showGuardian = true,
  showAdmission = true,
  className = '',
  isPrintPreview = false,
}) => {
  const schoolName = school?.name || 'SchoolSync Academy';
  const academicYear = school?.academicYear || '2026-2027';
  const classNameStr = classGrade ? `${classGrade.name} - Sec ${classGrade.section}` : `Class ${student.classId}`;
  const formattedRoll = String(student.rollNumber).padStart(4, '0');
  const cardIssuedDate = student.cardIssuedAt
    ? new Date(student.cardIssuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : 'Active';

  if (layout === 'vertical') {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden flex flex-col justify-between text-slate-900 select-none ${className}`}
        style={{
          width: '68mm',
          height: '102mm',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Top School Header Bar */}
        <div className="bg-[#0B192C] text-white p-2.5 text-center relative border-b-2 border-emerald-500">
          <div className="flex items-center justify-center gap-1.5">
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" className="w-5 h-5 rounded object-cover" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <h4 className="font-extrabold text-[12px] uppercase tracking-wider truncate max-w-[200px]">
              {schoolName}
            </h4>
          </div>
          <p className="text-[9px] text-slate-300 tracking-widest uppercase mt-0.5 font-medium">
            Student Identity Card · {academicYear}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-3 flex-1 flex flex-col items-center justify-between text-center space-y-2">
          {/* Photo & Roll Pill */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-emerald-600 p-0.5 bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="mt-1 px-2.5 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-mono font-bold tracking-wider">
              ROLL {formattedRoll}
            </div>
          </div>

          {/* Student Info */}
          <div>
            <h3 className="font-bold text-sm text-slate-950 leading-tight">
              {student.fullName}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
              {classNameStr}
            </p>
            {showGuardian && student.guardianName && (
              <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[220px]">
                <span className="text-slate-400">Guardian:</span> {student.guardianName}
              </p>
            )}
            {showAdmission && student.admissionNumber && (
              <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                Adm: {student.admissionNumber}
              </p>
            )}
          </div>

          {/* Scannable QR Code */}
          <div className="bg-white p-1 rounded border border-slate-200 shadow-sm">
            <QRCodeView value={student.qrCodeToken} size={88} />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-3 py-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-mono text-slate-500">
          <span>ID: {student.activeCredentialId ? student.activeCredentialId.substring(0, 12) : formattedRoll}</span>
          <span>Issued: {cardIssuedDate}</span>
        </div>
      </div>
    );
  }

  // Standard CR80 Landscape Format (85.6mm x 54mm)
  return (
    <div
      className={`bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden flex flex-col justify-between text-slate-900 select-none ${className}`}
      style={{
        width: '88mm',
        height: '56mm',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Top Header */}
      <div className="bg-[#0B192C] text-white px-3 py-1.5 flex items-center justify-between border-b-2 border-emerald-500">
        <div className="flex items-center gap-1.5 truncate max-w-[75%]">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-4 h-4 rounded object-cover" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="font-extrabold text-[11px] tracking-wide uppercase truncate">
            {schoolName}
          </span>
        </div>
        <span className="text-[8px] font-mono tracking-widest text-emerald-300 uppercase font-semibold">
          {academicYear}
        </span>
      </div>

      {/* Main Body: 3 columns (Photo, Details, QR) */}
      <div className="px-3 py-2 flex-1 flex items-center justify-between gap-2.5">
        {/* Photo Column */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-14 h-16 rounded border border-slate-300 bg-slate-50 p-0.5 overflow-hidden flex items-center justify-center shadow-inner">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded-sm" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <User className="w-7 h-7" />
                <span className="text-[7px] uppercase font-mono mt-0.5">Photo</span>
              </div>
            )}
          </div>
          <span className="mt-1 px-1.5 py-0.5 bg-slate-900 text-white rounded text-[8px] font-mono font-bold">
            ROLL {formattedRoll}
          </span>
        </div>

        {/* Details Column */}
        <div className="flex-1 min-w-0 pr-1 text-left space-y-0.5">
          <h3 className="font-extrabold text-[12px] text-slate-950 leading-tight truncate">
            {student.fullName}
          </h3>
          <p className="text-[10px] font-bold text-emerald-800">
            {classNameStr}
          </p>
          {showGuardian && student.guardianName && (
            <p className="text-[9px] text-slate-600 truncate leading-tight">
              <span className="text-slate-400 font-medium">Guardian:</span> {student.guardianName}
            </p>
          )}
          {showAdmission && student.admissionNumber && (
            <p className="text-[8px] font-mono text-slate-500 leading-tight">
              Adm: {student.admissionNumber}
            </p>
          )}
          <div className="pt-0.5 flex items-center gap-2 text-[8px] font-mono text-slate-400">
            <span>Status: <strong className="text-emerald-700 capitalize">{student.enrollmentStatus}</strong></span>
          </div>
        </div>

        {/* QR Code Column */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="bg-white p-1 rounded border border-slate-200 shadow-sm flex items-center justify-center">
            <QRCodeView value={student.qrCodeToken} size={64} />
          </div>
          <span className="text-[7px] font-mono text-slate-400 tracking-widest mt-0.5 uppercase">
            Official Pass
          </span>
        </div>
      </div>

      {/* Security Footnote Strip */}
      <div className="bg-slate-50 px-3 py-0.5 border-t border-slate-200 flex items-center justify-between text-[7px] font-mono text-slate-400">
        <span className="truncate max-w-[170px]">
          CID: {student.activeCredentialId ? student.activeCredentialId.substring(0, 16) : formattedRoll}
        </span>
        <span>Issued: {cardIssuedDate}</span>
      </div>
    </div>
  );
};
