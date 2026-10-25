import React, { useState } from 'react';
import {
  Printer,
  X,
  QrCode,
  Download,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  User,
  Sparkles,
  Info,
  Layers,
  Palette,
  Phone,
  Calendar,
  Eye
} from 'lucide-react';
import { Student, School, ClassGrade } from '../../types';
import { QRCodeView } from './QRCodeView';

export type CardTheme = 'navy' | 'emerald' | 'burgundy' | 'slate' | 'monochrome';
export type CardLayout = 'horizontal' | 'vertical';

interface StudentIDCardGeneratorProps {
  student: Student;
  school: School | null;
  classGrade?: ClassGrade;
  classes?: ClassGrade[];
  onClose?: () => void;
  initialLayout?: CardLayout;
  initialTheme?: CardTheme;
}

const THEME_CONFIGS: Record<
  CardTheme,
  {
    name: string;
    headerBg: string;
    headerBorder: string;
    accentText: string;
    badgeBg: string;
    badgeText: string;
    swatch: string;
  }
> = {
  navy: {
    name: 'Academy Navy',
    headerBg: 'bg-[#0B192C]',
    headerBorder: 'border-emerald-500',
    accentText: 'text-emerald-400',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-emerald-300',
    swatch: 'bg-[#0B192C]',
  },
  emerald: {
    name: 'Forest Emerald',
    headerBg: 'bg-emerald-900',
    headerBorder: 'border-amber-400',
    accentText: 'text-amber-300',
    badgeBg: 'bg-emerald-950',
    badgeText: 'text-amber-200',
    swatch: 'bg-emerald-800',
  },
  burgundy: {
    name: 'Royal Burgundy',
    headerBg: 'bg-rose-950',
    headerBorder: 'border-rose-400',
    accentText: 'text-rose-300',
    badgeBg: 'bg-rose-950',
    badgeText: 'text-rose-200',
    swatch: 'bg-rose-900',
  },
  slate: {
    name: 'Modern Slate',
    headerBg: 'bg-slate-900',
    headerBorder: 'border-sky-500',
    accentText: 'text-sky-400',
    badgeBg: 'bg-slate-950',
    badgeText: 'text-sky-300',
    swatch: 'bg-slate-800',
  },
  monochrome: {
    name: 'Classic B&W',
    headerBg: 'bg-black',
    headerBorder: 'border-slate-400',
    accentText: 'text-slate-300',
    badgeBg: 'bg-black',
    badgeText: 'text-white',
    swatch: 'bg-black',
  },
};

export const StudentIDCardGenerator: React.FC<StudentIDCardGeneratorProps> = ({
  student,
  school,
  classGrade,
  classes = [],
  onClose,
  initialLayout = 'horizontal',
  initialTheme = 'navy',
}) => {
  const [layout, setLayout] = useState<CardLayout>(initialLayout);
  const [theme, setTheme] = useState<CardTheme>(initialTheme);
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');

  // Configurable field visibility toggles
  const [showGuardian, setShowGuardian] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAdmission, setShowAdmission] = useState(true);
  const [showBloodDob, setShowBloodDob] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  // Computed data
  const schoolName = school?.name || 'SchoolSync Academy';
  const academicYear = school?.academicYear || '2026-2027';
  const activeClass = classGrade || classes.find((c) => c.id === student.classId);
  const classNameStr = activeClass ? `${activeClass.name} - Sec ${activeClass.section}` : `Class ${student.classId}`;
  const formattedRoll = String(student.rollNumber).padStart(4, '0');
  const cardIssuedDate = student.cardIssuedAt
    ? new Date(student.cardIssuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const themeConfig = THEME_CONFIGS[theme];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 overflow-y-auto">
      {/* Outer Card Generator Modal Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Student ID Card Generator & Print Studio
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded font-semibold">
                  ISO-Compliant QR
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Official credential template for {student.fullName} (Roll: {formattedRoll}) · {schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              title="Print ID Card directly to PVC badge or printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print ID Card</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Studio Body: Left Configuration Sidebar + Right Live Interactive Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Controls Sidebar (no-print) */}
          <div className="no-print w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto space-y-4 shrink-0 text-xs">
            
            {/* Quick Actions Strip */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" /> Card Format & Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayout('horizontal')}
                  className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    layout === 'horizontal'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-3.5 h-2.5 border border-current rounded-xs inline-block" />
                  <span>CR80 Landscape</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('vertical')}
                  className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    layout === 'vertical'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2.5 h-3.5 border border-current rounded-xs inline-block" />
                  <span>Portrait Badge</span>
                </button>
              </div>
            </div>

            {/* Face View: Front vs Back */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Card Face
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['front', 'back', 'both'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setCardSide(side)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold capitalize transition-all ${
                      cardSide === side
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Theme */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-500" /> School Theme
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(THEME_CONFIGS) as CardTheme[]).map((tKey) => {
                  const cfg = THEME_CONFIGS[tKey];
                  const isSelected = theme === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTheme(tKey)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full ${cfg.swatch} border border-slate-300 shadow-xs`} />
                        <span className="font-semibold text-slate-800">{cfg.name}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Fields Visibility Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Visible Card Elements
              </label>
              
              <label className="flex items-center justify-between text-slate-700 cursor-pointer select-none">
                <span>Father / Guardian Name</span>
                <input
                  type="checkbox"
                  checked={showGuardian}
                  onChange={(e) => setShowGuardian(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer select-none">
                <span>Guardian Phone</span>
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer select-none">
                <span>Admission Number</span>
                <input
                  type="checkbox"
                  checked={showAdmission}
                  onChange={(e) => setShowAdmission(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer select-none">
                <span>DOB & Blood Group</span>
                <input
                  type="checkbox"
                  checked={showBloodDob}
                  onChange={(e) => setShowBloodDob(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer select-none">
                <span>Principal Signature Line</span>
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={(e) => setShowSignature(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
              </label>
            </div>

            {/* Security Credential Info */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[10px] text-slate-500">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 font-sans">Credential ID:</span>
                <span className="text-emerald-700 font-bold">
                  {student.activeCredentialId ? student.activeCredentialId.substring(0, 14) : formattedRoll}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 font-sans">Issued Date:</span>
                <span>{cardIssuedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 font-sans">QR Version:</span>
                <span>ISO/IEC 18004 (v1)</span>
              </div>
            </div>

            {/* Print Help Banner */}
            <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200 text-[11px] text-sky-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span>Printing Best Practice</span>
              </div>
              <p className="text-[10px] leading-relaxed text-sky-800">
                In your print dialog, select <strong>"None" for Margins</strong> and check <strong>"Background graphics"</strong> to ensure accurate card border dimensions (CR80: 88mm × 56mm).
              </p>
            </div>
          </div>

          {/* Right Live Preview Area */}
          <div className="flex-1 bg-slate-100/80 p-4 sm:p-8 overflow-y-auto flex flex-col items-center justify-center min-h-[420px]">
            
            {/* Visual Guide Bar */}
            <div className="no-print mb-4 flex items-center justify-between w-full max-w-lg text-[11px] text-slate-500 px-1">
              <span className="font-medium flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                Live Scaled Card Preview
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">
                {layout === 'horizontal' ? 'Standard CR80 (88mm × 56mm)' : 'Badge Pocket (68mm × 102mm)'}
              </span>
            </div>

            {/* Cards Container (Print Target) */}
            <div className="flex flex-wrap items-center justify-center gap-6 p-4 bg-white/50 rounded-2xl border border-dashed border-slate-300 shadow-inner">
              
              {/* FRONT SIDE */}
              {(cardSide === 'front' || cardSide === 'both') && (
                <div className="flex flex-col items-center">
                  <span className="no-print text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
                    Front · ID & Attendance QR
                  </span>
                  
                  {layout === 'horizontal' ? (
                    /* Landscape CR80 Front */
                    <div
                      className={`bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden flex flex-col justify-between text-slate-900 select-none print-break-inside-avoid relative`}
                      style={{
                        width: '88mm',
                        height: '56mm',
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      {/* School Top Header Strip */}
                      <div className={`${themeConfig.headerBg} text-white px-3 py-1.5 flex items-center justify-between border-b-2 ${themeConfig.headerBorder}`}>
                        <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                          {school?.logoUrl ? (
                            <img src={school.logoUrl} alt="Logo" className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <ShieldCheck className={`w-3.5 h-3.5 ${themeConfig.accentText} shrink-0`} />
                          )}
                          <span className="font-extrabold text-[11px] tracking-wide uppercase truncate">
                            {schoolName}
                          </span>
                        </div>
                        <span className={`text-[8px] font-mono tracking-widest ${themeConfig.accentText} uppercase font-bold`}>
                          {academicYear}
                        </span>
                      </div>

                      {/* Card Content: 3 Columns (Photo, Student Details, Scannable QR) */}
                      <div className="px-3 py-2 flex-1 flex items-center justify-between gap-2.5">
                        {/* 1. Student Photograph */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-14 h-16 rounded border border-slate-300 bg-slate-50 p-0.5 overflow-hidden flex items-center justify-center shadow-inner">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded-xs" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <User className="w-7 h-7" />
                                <span className="text-[7px] uppercase font-mono mt-0.5 font-bold">STUDENT</span>
                              </div>
                            )}
                          </div>
                          <span className={`mt-1 px-1.5 py-0.5 ${themeConfig.badgeBg} ${themeConfig.badgeText} rounded text-[8px] font-mono font-bold tracking-wider`}>
                            ROLL {formattedRoll}
                          </span>
                        </div>

                        {/* 2. Student Information Details */}
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

                          {showPhone && student.guardianPhone && (
                            <p className="text-[8px] font-mono text-slate-600 truncate leading-tight">
                              <span className="text-slate-400 font-medium">Phone:</span> {student.guardianPhone}
                            </p>
                          )}

                          {showAdmission && student.admissionNumber && (
                            <p className="text-[8px] font-mono text-slate-500 leading-tight">
                              <span className="text-slate-400 font-medium">Adm No:</span> {student.admissionNumber}
                            </p>
                          )}

                          {showBloodDob && (student.dob || student.bloodGroup) && (
                            <p className="text-[8px] font-mono text-slate-500 leading-tight">
                              {student.bloodGroup && <span>Blood: <strong className="text-rose-700">{student.bloodGroup}</strong> </span>}
                              {student.dob && <span>· DOB: {student.dob}</span>}
                            </p>
                          )}
                        </div>

                        {/* 3. Scannable QR Code */}
                        <div className="shrink-0 flex flex-col items-center">
                          <div className="bg-white p-1 rounded border border-slate-200 shadow-xs flex items-center justify-center">
                            <QRCodeView value={student.qrCodeToken} size={64} />
                          </div>
                          <span className="text-[7px] font-mono text-slate-400 tracking-wider mt-0.5 uppercase font-semibold">
                            Scan Pass
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="bg-slate-50 px-3 py-0.5 border-t border-slate-200 flex items-center justify-between text-[7px] font-mono text-slate-400">
                        <span className="truncate max-w-[170px]">
                          CID: {student.activeCredentialId ? student.activeCredentialId.substring(0, 16) : formattedRoll}
                        </span>
                        <span>Issued: {cardIssuedDate}</span>
                      </div>
                    </div>
                  ) : (
                    /* Portrait Badge Front */
                    <div
                      className={`bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden flex flex-col justify-between text-slate-900 select-none print-break-inside-avoid relative`}
                      style={{
                        width: '68mm',
                        height: '102mm',
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      {/* Top Header */}
                      <div className={`${themeConfig.headerBg} text-white p-2.5 text-center relative border-b-2 ${themeConfig.headerBorder}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {school?.logoUrl ? (
                            <img src={school.logoUrl} alt="Logo" className="w-5 h-5 rounded object-cover" />
                          ) : (
                            <ShieldCheck className={`w-4 h-4 ${themeConfig.accentText} shrink-0`} />
                          )}
                          <h4 className="font-extrabold text-[12px] uppercase tracking-wider truncate max-w-[200px]">
                            {schoolName}
                          </h4>
                        </div>
                        <p className={`text-[9px] ${themeConfig.accentText} tracking-widest uppercase mt-0.5 font-bold`}>
                          Student Identity Card · {academicYear}
                        </p>
                      </div>

                      {/* Middle Body */}
                      <div className="p-3 flex-1 flex flex-col items-center justify-between text-center space-y-2">
                        {/* Photo & Roll */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full border-2 border-slate-300 p-0.5 bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <User className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                          <div className={`mt-1 px-2.5 py-0.5 ${themeConfig.badgeBg} ${themeConfig.badgeText} rounded-full text-[10px] font-mono font-bold tracking-wider`}>
                            ROLL {formattedRoll}
                          </div>
                        </div>

                        {/* Name & Academic Info */}
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
                          {showPhone && student.guardianPhone && (
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                              Tel: {student.guardianPhone}
                            </p>
                          )}
                          {showAdmission && student.admissionNumber && (
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                              Adm: {student.admissionNumber}
                            </p>
                          )}
                        </div>

                        {/* Scannable QR */}
                        <div className="bg-white p-1 rounded border border-slate-200 shadow-xs">
                          <QRCodeView value={student.qrCodeToken} size={84} />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-slate-100 px-3 py-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-mono text-slate-500">
                        <span>ID: {student.activeCredentialId ? student.activeCredentialId.substring(0, 12) : formattedRoll}</span>
                        <span>Issued: {cardIssuedDate}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BACK SIDE */}
              {(cardSide === 'back' || cardSide === 'both') && (
                <div className="flex flex-col items-center">
                  <span className="no-print text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
                    Back · Emergency & Terms
                  </span>

                  {layout === 'horizontal' ? (
                    /* Landscape CR80 Back */
                    <div
                      className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden flex flex-col justify-between text-slate-900 select-none print-break-inside-avoid p-3"
                      style={{
                        width: '88mm',
                        height: '56mm',
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">
                            Cardholder Terms & Policy
                          </span>
                          <span className="text-[8px] font-mono text-slate-400">NON-TRANSFERABLE</span>
                        </div>
                        <p className="text-[8px] text-slate-500 leading-tight">
                          1. This credential card must be presented for daily attendance registration and campus entry.
                        </p>
                        <p className="text-[8px] text-slate-500 leading-tight">
                          2. Report loss or damage immediately to the principal office for credential reissuance.
                        </p>
                        <p className="text-[8px] text-slate-500 leading-tight">
                          3. If found, please return to: {schoolName}, {school?.address || 'School Administration Office'}.
                        </p>
                      </div>

                      {/* Emergency & Signature line */}
                      <div className="flex items-end justify-between pt-1 border-t border-slate-200">
                        <div className="text-[8px] text-slate-600 space-y-0.5">
                          <p className="font-semibold text-slate-800">Emergency Helpline:</p>
                          <p className="font-mono">{school?.contactPhone || '+1 (555) 019-2834'}</p>
                          <p className="font-mono text-slate-400">{school?.contactEmail || 'office@schoolsync.edu'}</p>
                        </div>

                        {showSignature && (
                          <div className="text-center">
                            <div className="w-24 border-b border-slate-400 pb-0.5 mb-0.5 font-serif italic text-[9px] text-slate-600">
                              {school?.principalName || 'Principal'}
                            </div>
                            <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest">
                              Authorized Seal
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Portrait Badge Back */
                    <div
                      className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden flex flex-col justify-between text-slate-900 select-none print-break-inside-avoid p-4"
                      style={{
                        width: '68mm',
                        height: '102mm',
                        boxSizing: 'border-box',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      <div className="space-y-2 text-left">
                        <div className="border-b border-slate-200 pb-1.5 text-center">
                          <h5 className="font-bold text-[11px] text-slate-900 uppercase">
                            Official Student Credential
                          </h5>
                          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                            Property of {schoolName}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[8.5px] text-slate-600 leading-normal">
                          <p>
                            • This card remains the property of {schoolName} and must be surrendered upon graduation or transfer.
                          </p>
                          <p>
                            • Daily attendance records are timestamped and verified via the optical QR credential.
                          </p>
                          <p>
                            • Fraudulent scanning or credential sharing is strictly prohibited under school regulations.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="bg-slate-50 p-2 rounded text-[8px] text-slate-700 font-mono space-y-0.5">
                          <p className="font-bold text-slate-900 font-sans">Campus Emergency Contact:</p>
                          <p>{school?.contactPhone || '+1 (555) 019-2834'}</p>
                          <p className="truncate">{school?.address || 'School Administration Office'}</p>
                        </div>

                        {showSignature && (
                          <div className="text-center pt-1">
                            <div className="w-28 mx-auto border-b border-slate-400 pb-1 font-serif italic text-[10px] text-slate-700">
                              {school?.principalName || 'Principal'}
                            </div>
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">
                              Authorized Signature
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Footer in preview */}
            <div className="no-print mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print ID Card Now (Ctrl + P)</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors shadow-xs"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
