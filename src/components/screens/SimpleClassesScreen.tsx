import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Users,
  Download,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Clock,
  Table,
  Check,
  Search,
  FileSpreadsheet,
  QrCode
} from 'lucide-react';
import { School, ClassGrade, Student, AttendanceRecord, AttendanceStatus } from '../../types';
import { schoolService } from '../../services/schoolService';
import { downloadStudentIDCardPDF } from '../../services/pdfGenerator';
import { getTodaySchoolDate } from '../../services/seedData';

interface SimpleClassesScreenProps {
  school: School | null;
  onNavigateToAddStudent: (classId?: string) => void;
  onNavigateToScan: () => void;
}

export const SimpleClassesScreen: React.FC<SimpleClassesScreenProps> = ({
  school,
  onNavigateToAddStudent,
  onNavigateToScan,
}) => {
  const todayDate = getTodaySchoolDate();
  const todayParts = todayDate.split('-').map(Number);

  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active folder view (null = folder list; string = classId of open folder)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [registerMode, setRegisterMode] = useState<'daily' | 'monthly'>('daily');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [dateAttendance, setDateAttendance] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loadingFolder, setLoadingFolder] = useState(false);

  // Search filter inside register
  const [searchQuery, setSearchQuery] = useState('');

  // Monthly matrix state
  const [currentYear, setCurrentYear] = useState<number>(todayParts[0] || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayParts[1] || new Date().getMonth() + 1);
  const [monthlyMatrix, setMonthlyMatrix] = useState<{
    daysInMonth: number[];
    students: {
      student: Student;
      days: Record<number, AttendanceStatus | 'weekend' | 'unrecorded'>;
      presentCount: number;
      absentCount: number;
      sickCount: number;
      leaveCount: number;
      rate: number;
    }[];
    dates: string[];
  }>({
    daysInMonth: [],
    students: [],
    dates: [],
  });
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Add Class Modal state
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [headmasterInput, setHeadmasterInput] = useState(school?.principalName || 'Headmaster');
  const [savingClass, setSavingClass] = useState(false);

  // PDF downloading indicator per student
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Quick 4-status setter expanded student ID
  const [statusSelectorStudentId, setStatusSelectorStudentId] = useState<string | null>(null);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const list = await schoolService.getClasses();
      setClasses(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load classes';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // When a class folder is selected or date changes, load its students & attendance
  const openClassFolder = async (classId: string, forDate = selectedDate) => {
    setSelectedClassId(classId);
    setLoadingFolder(true);
    setSearchQuery('');
    try {
      const students = await schoolService.getStudentsByClass(classId);
      // Alphabetical sort by student full name
      const sorted = [...students].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
      );
      setClassStudents(sorted);

      // Fetch attendance for this class and selected date
      const records = await schoolService.getAttendanceForClassAndDate(classId, forDate);
      const map = new Map<string, AttendanceRecord>();
      records.forEach((r) => map.set(r.studentId, r));
      setDateAttendance(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load class roster';
      setErrorMessage(msg);
    } finally {
      setLoadingFolder(false);
    }
  };

  // Load monthly matrix for this class
  const loadMonthlyData = useCallback(async (classId: string, year: number, month: number) => {
    try {
      setLoadingMatrix(true);
      const matrix = await schoolService.getMonthlyAttendanceMatrix(classId, year, month);
      setMonthlyMatrix(matrix);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load monthly attendance';
      setErrorMessage(msg);
    } finally {
      setLoadingMatrix(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId && registerMode === 'monthly') {
      loadMonthlyData(selectedClassId, currentYear, currentMonth);
    }
  }, [selectedClassId, registerMode, currentYear, currentMonth, loadMonthlyData]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (selectedClassId) {
      openClassFolder(selectedClassId, newDate);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Add Class form submission
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = classNameInput.trim();
    if (!cleanName) {
      setErrorMessage('Class Name is required.');
      return;
    }

    try {
      setSavingClass(true);
      setErrorMessage(null);
      const created = await schoolService.createClass({
        name: cleanName,
        headmasterName: headmasterInput.trim() || undefined,
        section: '',
        academicYear: school?.academicYear || '2026-2027',
      });
      await loadClasses();
      setShowAddClassModal(false);
      setClassNameInput('');
      setHeadmasterInput(school?.principalName || 'Headmaster');
      openClassFolder(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create class';
      setErrorMessage(msg);
    } finally {
      setSavingClass(false);
    }
  };

  // Download PDF ID card for student
  const handleDownloadPDF = async (student: Student, cls: ClassGrade) => {
    try {
      setDownloadingStudentId(student.id);
      setDownloadSuccessMessage(null);
      await downloadStudentIDCardPDF({
        schoolName: school?.name || 'SchoolSync Academy',
        student,
        className: cls.name,
        headmasterName: cls.headmasterName || school?.principalName || 'Headmaster',
        academicYear: school?.academicYear || cls.academicYear || '2026-2027',
      });
      setDownloadSuccessMessage(`Downloaded ID Card for ${student.fullName}`);
      setTimeout(() => setDownloadSuccessMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate PDF ID card';
      setErrorMessage(msg);
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const activeClass = classes.find((c) => c.id === selectedClassId);

  // Set explicit attendance status (Present, Absent, Leave, Sick)
  const handleSetStudentStatus = async (studentId: string, status: AttendanceStatus, targetDate = selectedDate) => {
    if (!selectedClassId) return;
    setStatusSelectorStudentId(null);
    try {
      await schoolService.markAttendance({
        studentId,
        classId: selectedClassId,
        date: targetDate,
        status,
        method: 'manual_entry',
      });
      // Refresh daily attendance map
      const records = await schoolService.getAttendanceForClassAndDate(selectedClassId, selectedDate);
      const map = new Map<string, AttendanceRecord>();
      records.forEach((r) => map.set(r.studentId, r));
      setDateAttendance(map);

      // If in monthly mode, reload matrix too
      if (registerMode === 'monthly') {
        loadMonthlyData(selectedClassId, currentYear, currentMonth);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update attendance';
      setErrorMessage(msg);
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const query = searchQuery.trim().toLowerCase();
    return classStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(query))
    );
  }, [classStudents, searchQuery]);

  // Attendance breakdown counts for Selected Date
  const presentCount = Array.from(dateAttendance.values()).filter((r) => r.status === 'present').length;
  const absentCount = Array.from(dateAttendance.values()).filter((r) => r.status === 'absent').length;
  const leaveCount = Array.from(dateAttendance.values()).filter((r) => r.status === 'approved_leave').length;
  const sickCount = Array.from(dateAttendance.values()).filter((r) => r.status === 'sick_leave').length;
  const recordedCount = presentCount + absentCount + leaveCount + sickCount;
  const pendingCount = Math.max(0, classStudents.length - recordedCount);

  // Monthly stats
  const totalMonthlyPresent = monthlyMatrix.students.reduce((sum, s) => sum + s.presentCount, 0);
  const totalMonthlyPossible = monthlyMatrix.students.reduce(
    (sum, s) => sum + s.presentCount + s.absentCount + s.sickCount + s.leaveCount,
    0
  );
  const monthlyRate = totalMonthlyPossible > 0 ? Math.round((totalMonthlyPresent / totalMonthlyPossible) * 100) : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {downloadSuccessMessage && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-500 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{downloadSuccessMessage}</span>
        </div>
      )}

      {/* VIEW 1: CLASS REGISTER OPEN VIEW */}
      {selectedClassId && activeClass ? (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          
          {/* Top Control Bar: Back button, Class Name & View Mode Switcher */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedClassId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Classes</span>
              </button>

              {/* View Switcher: Daily Register vs Monthly Attendance */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setRegisterMode('daily')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    registerMode === 'daily'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Daily Register
                </button>
                <button
                  onClick={() => setRegisterMode('monthly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    registerMode === 'monthly'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Monthly Attendance
                </button>
              </div>
            </div>

            {/* Class Title and Action Button */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-6 h-6 text-emerald-600 shrink-0" />
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                    {activeClass.name} Register
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Headmaster: <strong className="text-slate-800">{activeClass.headmasterName || school?.principalName || 'Headmaster'}</strong> · {classStudents.length} Students
                </p>
              </div>

              {/* Add Student to THIS class shortcut */}
              <button
                onClick={() => onNavigateToAddStudent(activeClass.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Student</span>
              </button>
            </div>

            {/* DAILY MODE CONTROLS & KPI BAR */}
            {registerMode === 'daily' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    Selected Date:
                  </span>
                  
                  {/* Selected Date Picker */}
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="bg-transparent font-mono font-bold text-xs text-slate-900 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Status Summary KPI Breakdown (Present, Absent, Leave, Sick, Pending) */}
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Present</span>
                    <span className="text-sm font-black text-emerald-950">{presentCount}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[9px] font-bold uppercase text-rose-700 block">Absent</span>
                    <span className="text-sm font-black text-rose-950">{absentCount}</span>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[9px] font-bold uppercase text-blue-700 block">Leave</span>
                    <span className="text-sm font-black text-blue-950">{leaveCount}</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold uppercase text-amber-700 block">Sick</span>
                    <span className="text-sm font-black text-amber-950">{sickCount}</span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">Pending</span>
                    <span className="text-sm font-black text-slate-700">{pendingCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY MODE CONTROLS & KPI BAR */}
            {registerMode === 'monthly' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    Month:
                  </span>
                  
                  {/* Month Switcher */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-900 px-3 tracking-wide">
                      {monthName}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Monthly KPI */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Enrolled</span>
                    <span className="text-sm font-black text-slate-900">{classStudents.length}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Total Present</span>
                    <span className="text-sm font-black text-emerald-950">{totalMonthlyPresent}</span>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[9px] font-bold uppercase text-blue-700 block">Attendance Rate</span>
                    <span className="text-sm font-black text-blue-950">{monthlyRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter student by name or roll number..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* MODE 1: DAILY CLASS STUDENT REGISTER */}
          {registerMode === 'daily' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              
              {/* Table Column Header Guide:
                  Roll No. | Student Name | Father's Name | Selected Date | Attendance Status */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 pb-2 border-b border-slate-200 text-[10px] font-mono font-bold uppercase text-slate-400">
                <span className="col-span-2">Roll No.</span>
                <span className="col-span-4">Student Name</span>
                <span className="col-span-3">Father's Name</span>
                <span className="col-span-3 text-right">Attendance Status</span>
              </div>

              {loadingFolder ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  Loading class register...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {searchQuery ? 'No Students Match Filter' : 'No Students in this Class'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {searchQuery
                      ? 'Try clearing the search query to see all students.'
                      : `Add students to ${activeClass.name} to generate ID cards and record attendance.`}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => onNavigateToAddStudent(activeClass.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Add First Student</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map((student) => {
                    const record = dateAttendance.get(student.id);
                    const currentStatus: AttendanceStatus = record ? record.status : 'pending';
                    const isDownloading = downloadingStudentId === student.id;
                    const isSelectingStatus = statusSelectorStudentId === student.id;

                    return (
                      <div
                        key={student.id}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200 transition-all space-y-2.5"
                      >
                        {/* Student Row */}
                        <div className="flex items-center justify-between gap-3">
                          
                          {/* Student Details: Roll No, Name, Father's Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Photo / Avatar */}
                            <div className="w-11 h-11 rounded-xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-black font-mono text-slate-600">
                                  {student.fullName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 text-[11px] shrink-0">
                                  Roll: {student.rollNumber}
                                </span>
                                <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                  {student.fullName}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                                <span>Father: <strong className="text-slate-700">{student.guardianName || '—'}</strong></span>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono text-[10px] text-slate-400">{selectedDate}</span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Status Indicator & ID Download */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status Indicator: Green check (Present), Red cross (Absent), Blue (Leave), Amber (Sick), Slate (Pending) */}
                            <button
                              onClick={() => setStatusSelectorStudentId(isSelectingStatus ? null : student.id)}
                              title="Tap to change status"
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                                  : currentStatus === 'absent'
                                  ? 'bg-rose-100 text-rose-950 border-rose-400'
                                  : currentStatus === 'approved_leave'
                                  ? 'bg-blue-100 text-blue-950 border-blue-400'
                                  : currentStatus === 'sick_leave'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {currentStatus === 'present' && (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  <span>Present</span>
                                </>
                              )}
                              {currentStatus === 'absent' && (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                                  <span>Absent</span>
                                </>
                              )}
                              {currentStatus === 'approved_leave' && (
                                <>
                                  <Calendar className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                                  <span>Leave</span>
                                </>
                              )}
                              {currentStatus === 'sick_leave' && (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                                  <span>Sick</span>
                                </>
                              )}
                              {currentStatus === 'pending' && (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Pending</span>
                                </>
                              )}
                            </button>

                            {/* Download Printable ID Card Button */}
                            <button
                              onClick={() => handleDownloadPDF(student, activeClass)}
                              disabled={isDownloading}
                              title="Download Printable ID Card"
                              className="p-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-300 hover:border-slate-900 rounded-xl text-slate-700 transition-colors shadow-xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400" />
                            </button>
                          </div>
                        </div>

                        {/* Four Quick-Action Status Buttons (Present, Absent, Leave, Sick) */}
                        {isSelectingStatus && (
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1.5 animate-in fade-in duration-100">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Set:</span>
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <button
                                onClick={() => handleSetStudentStatus(student.id, 'present')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-[11px] font-black transition-colors"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleSetStudentStatus(student.id, 'absent')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-black transition-colors"
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => handleSetStudentStatus(student.id, 'approved_leave')}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black transition-colors"
                              >
                                Leave
                              </button>
                              <button
                                onClick={() => handleSetStudentStatus(student.id, 'sick_leave')}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-black transition-colors"
                              >
                                Sick
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: MONTHLY ATTENDANCE SHEET OF MONTH */}
          {registerMode === 'monthly' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Daily Attendance Matrix for {monthName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tap any date cell to toggle between Present / Absent
                  </p>
                </div>
              </div>

              {loadingMatrix ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  Loading monthly attendance...
                </div>
              ) : monthlyMatrix.students.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No student records available for {monthName}.
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px]">
                        <th className="p-2.5 sticky left-0 bg-slate-900 z-10 font-bold border-r border-slate-800">
                          Roll
                        </th>
                        <th className="p-2.5 sticky left-12 bg-slate-900 z-10 font-bold border-r border-slate-800 min-w-[130px]">
                          Student Name
                        </th>
                        {monthlyMatrix.daysInMonth.map((dayNum) => (
                          <th key={dayNum} className="p-1.5 text-center font-bold border-r border-slate-800 min-w-[28px]">
                            {dayNum}
                          </th>
                        ))}
                        <th className="p-2 text-center font-bold bg-emerald-950 text-emerald-300">P</th>
                        <th className="p-2 text-center font-bold bg-rose-950 text-rose-300">A</th>
                        <th className="p-2 text-center font-bold bg-blue-950 text-blue-300">L</th>
                        <th className="p-2 text-center font-bold bg-amber-950 text-amber-300">S</th>
                        <th className="p-2 text-center font-bold">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {monthlyMatrix.students.map(({ student, days, presentCount, absentCount, leaveCount, sickCount, rate }, idx) => (
                        <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2 font-mono font-bold text-slate-900 sticky left-0 bg-inherit z-10 border-r border-slate-200">
                            {student.rollNumber}
                          </td>
                          <td className="p-2 font-bold text-slate-900 sticky left-12 bg-inherit z-10 border-r border-slate-200 truncate max-w-[130px]">
                            {student.fullName}
                          </td>

                          {monthlyMatrix.daysInMonth.map((dayNum) => {
                            const status = days[dayNum];
                            const dateStr = monthlyMatrix.dates[dayNum - 1];

                            let cellContent = '·';
                            let colorClass = 'text-slate-300';
                            if (status === 'present') {
                              cellContent = 'P';
                              colorClass = 'bg-emerald-100 text-emerald-900 font-bold';
                            } else if (status === 'absent') {
                              cellContent = 'A';
                              colorClass = 'bg-rose-100 text-rose-900 font-bold';
                            } else if (status === 'approved_leave') {
                              cellContent = 'L';
                              colorClass = 'bg-blue-100 text-blue-900 font-bold';
                            } else if (status === 'sick_leave') {
                              cellContent = 'S';
                              colorClass = 'bg-amber-100 text-amber-900 font-bold';
                            } else if (status === 'weekend') {
                              cellContent = '-';
                              colorClass = 'bg-slate-100 text-slate-400';
                            }

                            return (
                              <td
                                key={dayNum}
                                onClick={() => {
                                  if (status === 'weekend') return;
                                  const nextStatus: AttendanceStatus = status === 'present' ? 'absent' : 'present';
                                  handleSetStudentStatus(student.id, nextStatus, dateStr);
                                }}
                                className={`p-1 text-center border-r border-slate-200 cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
                              >
                                {cellContent}
                              </td>
                            );
                          })}

                          <td className="p-1.5 text-center font-extrabold text-emerald-700 bg-emerald-50">
                            {presentCount}
                          </td>
                          <td className="p-1.5 text-center font-extrabold text-rose-700 bg-rose-50">
                            {absentCount}
                          </td>
                          <td className="p-1.5 text-center font-extrabold text-blue-700 bg-blue-50">
                            {leaveCount}
                          </td>
                          <td className="p-1.5 text-center font-extrabold text-amber-700 bg-amber-50">
                            {sickCount}
                          </td>
                          <td className="p-1.5 text-center font-extrabold text-slate-900">
                            {rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* VIEW 2: ALL CLASS FOLDERS / CARDS */
        <div className="space-y-5">
          {/* Header with '+ Add Class' button */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Classes & Registers
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a class to view its daily attendance register and student ID cards.
                </p>
              </div>

              {/* Simple '+ Add Class' Button */}
              <button
                onClick={() => setShowAddClassModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Class</span>
              </button>
            </div>
          </div>

          {/* Class Folder Cards */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Folder className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Classes Created Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Create a class folder to begin enrolling students, recording attendance, and printing ID cards.
                </p>
              </div>
              <button
                onClick={() => setShowAddClassModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ Add Your First Class</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => openClassFolder(cls.id)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#0B192C] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                      <Folder className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Headmaster: <strong className="text-slate-700">{cls.headmasterName || school?.principalName || 'Headmaster'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {cls.studentCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Students
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-200 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* '+ Add Class' MODAL */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Add New Class</h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="e.g. Grade 10"
                  className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Headmaster Name
                </label>
                <input
                  type="text"
                  value={headmasterInput}
                  onChange={(e) => setHeadmasterInput(e.target.value)}
                  placeholder="e.g. Principal Khan"
                  className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {savingClass ? 'Saving...' : 'SAVE CLASS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
