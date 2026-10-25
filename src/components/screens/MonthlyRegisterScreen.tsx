import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  UserPlus,
  Table,
  LayoutGrid,
  FileText,
  AlertCircle
} from 'lucide-react';
import { School, ClassGrade, Student, AttendanceStatus, AttendanceRecord } from '../../types';
import { schoolService } from '../../services/schoolService';
import { downloadStudentIDCardPDF } from '../../services/pdfGenerator';
import { getTodaySchoolDate } from '../../services/seedData';

interface MonthlyRegisterScreenProps {
  school: School | null;
  onNavigateToAddStudent: (classId?: string) => void;
  onNavigateToScan: () => void;
}

export const MonthlyRegisterScreen: React.FC<MonthlyRegisterScreenProps> = ({
  school,
  onNavigateToAddStudent,
  onNavigateToScan,
}) => {
  const currentDateStr = getTodaySchoolDate();
  const todayParts = currentDateStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState<number>(todayParts[0] || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayParts[1] || new Date().getMonth() + 1);
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'sheet'>('cards');

  // Matrix data
  const [matrixData, setMatrixData] = useState<{
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

  const [loading, setLoading] = useState(true);
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load classes and monthly attendance matrix
  const loadRegisterData = async () => {
    try {
      setLoading(true);
      const [classList, matrix] = await Promise.all([
        schoolService.getClasses(),
        schoolService.getMonthlyAttendanceMatrix(selectedClassId, currentYear, currentMonth),
      ]);
      setClasses(classList);
      setMatrixData(matrix);
    } catch (err: any) {
      console.error('Failed to load monthly register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegisterData();
  }, [selectedClassId, currentYear, currentMonth]);

  // Navigate months
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

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return matrixData.students;
    const query = searchQuery.trim().toLowerCase();
    return matrixData.students.filter(
      (item) =>
        item.student.fullName.toLowerCase().includes(query) ||
        item.student.rollNumber.toLowerCase().includes(query) ||
        (item.student.guardianName && item.student.guardianName.toLowerCase().includes(query))
    );
  }, [matrixData.students, searchQuery]);

  // One-tap attendance toggle
  const handleToggleAttendance = async (studentId: string, dateStr: string, currentStatus: string) => {
    const studentItem = matrixData.students.find((s) => s.student.id === studentId);
    if (!studentItem) return;

    const newStatus: AttendanceStatus = currentStatus === 'present' ? 'absent' : 'present';

    try {
      await schoolService.markAttendance({
        studentId,
        classId: studentItem.student.classId,
        date: dateStr,
        status: newStatus,
        method: 'manual_entry',
      });
      await loadRegisterData();
      setStatusMessage(`Updated ${studentItem.student.fullName}: ${newStatus.toUpperCase()}`);
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: any) {
      console.error('Failed to update attendance:', err);
    }
  };

  // Direct ID Card Download
  const handleDownloadIdCard = async (student: Student) => {
    setDownloadingStudentId(student.id);
    try {
      const cls = classes.find((c) => c.id === student.classId);
      const classNameStr = cls ? cls.name : 'SchoolSync Class';
      await downloadStudentIDCardPDF({
        schoolName: school?.name || 'SchoolSync Academy',
        student,
        className: classNameStr,
        headmasterName: cls?.headmasterName || school?.principalName || 'Headmaster',
        academicYear: school?.academicYear || '2026-2027',
      });
      setStatusMessage(`Downloaded ID Card for ${student.fullName}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to download card:', err);
    } finally {
      setDownloadingStudentId(null);
    }
  };

  // Overall attendance rate calculation
  const totalPresentLogs = matrixData.students.reduce((sum, s) => sum + s.presentCount, 0);
  const totalPossibleLogs = matrixData.students.reduce(
    (sum, s) => sum + s.presentCount + s.absentCount + s.sickCount + s.leaveCount,
    0
  );
  const averageRate = totalPossibleLogs > 0 ? Math.round((totalPresentLogs / totalPossibleLogs) * 100) : 0;

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-14">
      
      {/* Top Header & Month Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Monthly Attendance Register
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily attendance register and student ID cards for {monthName}.
            </p>
          </div>

          <button
            onClick={() => onNavigateToAddStudent(selectedClassId !== 'all' ? selectedClassId : undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Add Student</span>
          </button>
        </div>

        {/* Month Selector Bar & Class Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Month Switcher */}
          <div className="flex items-center justify-between bg-slate-100 rounded-2xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-extrabold text-slate-900 px-3 tracking-wide">
              {monthName}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Class Filter & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="flex-1 sm:flex-none p-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-slate-900"
            >
              <option value="all">All Classes ({matrixData.students.length} students)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle: Cards vs Register Sheet */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Student Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('sheet')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'sheet'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Register Sheet Table"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Summary KPI Bar */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-center">
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Enrolled
            </span>
            <span className="text-base font-black text-slate-900">
              {matrixData.students.length}
            </span>
          </div>

          <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total Present
            </span>
            <span className="text-base font-black text-emerald-900">
              {totalPresentLogs}
            </span>
          </div>

          <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
              Month Rate
            </span>
            <span className="text-base font-black text-blue-900">
              {averageRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-2xl text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search student by name or roll number..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:border-slate-900"
        />
      </div>

      {/* VIEW 1: STUDENT CARDS & ID BADGES (Clear Attendance of Month) */}
      {viewMode === 'cards' && (
        <div className="space-y-3.5">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              Loading register...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Students Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No students enrolled in this selection. Add students to view their monthly attendance register.
              </p>
              <button
                onClick={() => onNavigateToAddStudent(selectedClassId !== 'all' ? selectedClassId : undefined)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Add First Student</span>
              </button>
            </div>
          ) : (
            filteredStudents.map(({ student, days, presentCount, absentCount, rate }) => {
              const currentDayNum = todayParts[2];
              const todayStatus = days[currentDayNum];
              const isPresentToday = todayStatus === 'present';
              const targetClass = classes.find((c) => c.id === student.classId);

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3.5"
                >
                  {/* Student Top Row: Photo, Name, Roll, Father, ID Download */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Photo / Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold font-mono text-slate-600">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name & Information */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 truncate">
                            {student.fullName}
                          </h3>
                          <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md shrink-0">
                            ROLL: {student.rollNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {student.guardianName ? `Father: ${student.guardianName} · ` : ''}
                          <strong className="text-emerald-700 font-semibold">{targetClass?.name || 'Class'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Download ID Card Button */}
                    <button
                      onClick={() => handleDownloadIdCard(student)}
                      disabled={downloadingStudentId === student.id}
                      className="p-2 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl text-slate-700 transition-colors shadow-xs shrink-0 flex items-center gap-1.5 text-xs font-bold"
                      title="Download Student ID Card"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400" />
                      <span className="hidden sm:inline">ID Card</span>
                    </button>
                  </div>

                  {/* Middle Row: Today's Status & Monthly Stats */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    
                    {/* Today Attendance Quick Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Today:</span>
                      <button
                        onClick={() => handleToggleAttendance(student.id, currentDateStr, isPresentToday ? 'present' : 'absent')}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPresentToday
                            ? 'bg-emerald-500 text-slate-950 shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {isPresentToday ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Unmarked</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Monthly Attendance Breakdown */}
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="font-semibold text-emerald-700">
                        P: <strong>{presentCount}</strong>
                      </span>
                      <span className="font-semibold text-rose-700">
                        A: <strong>{absentCount}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                        {rate}% Rate
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Mini Daily Attendance Calendar Dots for the Month */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Daily Attendance for {monthName}
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {matrixData.daysInMonth.map((dayNum) => {
                        const status = days[dayNum];
                        const dateStr = matrixData.dates[dayNum - 1];
                        const isToday = dayNum === currentDayNum && currentMonth === todayParts[1] && currentYear === todayParts[0];

                        let bgClass = 'bg-slate-100 text-slate-400 border-slate-200';
                        if (status === 'present') bgClass = 'bg-emerald-500 text-slate-950 font-black border-emerald-600';
                        else if (status === 'absent') bgClass = 'bg-rose-500 text-white font-black border-rose-600';
                        else if (status === 'weekend') bgClass = 'bg-slate-200 text-slate-400 border-slate-200';

                        return (
                          <button
                            key={dayNum}
                            onClick={() => handleToggleAttendance(student.id, dateStr, status === 'present' ? 'present' : 'absent')}
                            title={`Day ${dayNum}: ${status}`}
                            className={`w-6 h-7 rounded-md border text-[9px] flex flex-col items-center justify-center shrink-0 transition-transform active:scale-95 ${bgClass} ${
                              isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                            }`}
                          >
                            <span>{dayNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: MONTHLY REGISTER SHEET (Full Register Table Matrix) */}
      {viewMode === 'sheet' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Register Sheet Matrix ({monthName})
            </h3>
            <span className="text-[11px] text-slate-500">
              Tap any date cell to toggle attendance
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px]">
                  <th className="p-3 sticky left-0 bg-slate-900 z-10 font-bold border-r border-slate-800">
                    Roll
                  </th>
                  <th className="p-3 sticky left-12 bg-slate-900 z-10 font-bold border-r border-slate-800 min-w-[140px]">
                    Student Name
                  </th>
                  {matrixData.daysInMonth.map((dayNum) => (
                    <th key={dayNum} className="p-2 text-center font-bold border-r border-slate-800 min-w-[32px]">
                      {dayNum}
                    </th>
                  ))}
                  <th className="p-3 text-center font-bold bg-emerald-950 text-emerald-300">P</th>
                  <th className="p-3 text-center font-bold bg-rose-950 text-rose-300">A</th>
                  <th className="p-3 text-center font-bold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredStudents.map(({ student, days, presentCount, absentCount, rate }, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-2.5 font-mono font-bold text-slate-900 sticky left-0 bg-inherit z-10 border-r border-slate-200">
                      {student.rollNumber}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 sticky left-12 bg-inherit z-10 border-r border-slate-200 truncate max-w-[140px]">
                      {student.fullName}
                    </td>

                    {matrixData.daysInMonth.map((dayNum) => {
                      const status = days[dayNum];
                      const dateStr = matrixData.dates[dayNum - 1];

                      let cellContent = '·';
                      let colorClass = 'text-slate-300';
                      if (status === 'present') {
                        cellContent = 'P';
                        colorClass = 'bg-emerald-100 text-emerald-900 font-bold';
                      } else if (status === 'absent') {
                        cellContent = 'A';
                        colorClass = 'bg-rose-100 text-rose-900 font-bold';
                      } else if (status === 'weekend') {
                        cellContent = '-';
                        colorClass = 'bg-slate-100 text-slate-400';
                      }

                      return (
                        <td
                          key={dayNum}
                          onClick={() => handleToggleAttendance(student.id, dateStr, status === 'present' ? 'present' : 'absent')}
                          className={`p-1.5 text-center border-r border-slate-200 cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}

                    <td className="p-2 text-center font-extrabold text-emerald-700 bg-emerald-50">
                      {presentCount}
                    </td>
                    <td className="p-2 text-center font-extrabold text-rose-700 bg-rose-50">
                      {absentCount}
                    </td>
                    <td className="p-2 text-center font-extrabold text-slate-900">
                      {rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
