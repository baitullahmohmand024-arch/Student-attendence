import React, { useState } from 'react';
import { School, Student, ClassGrade } from '../../types';
import { StudentIDCard } from './StudentIDCard';
import { Printer, X, LayoutGrid, CheckSquare, Square, Download, Sliders } from 'lucide-react';

interface PrintableIDCardsSheetProps {
  students: Student[];
  school: School | null;
  classes: ClassGrade[];
  onClose: () => void;
  initialClassId?: string;
  selectedStudentId?: string;
}

export const PrintableIDCardsSheet: React.FC<PrintableIDCardsSheetProps> = ({
  students,
  school,
  classes,
  onClose,
  initialClassId,
  selectedStudentId,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'all');
  const [cardLayout, setCardLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showGuardian, setShowGuardian] = useState(true);
  const [showAdmission, setShowAdmission] = useState(true);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (selectedStudentId) {
      return new Set([selectedStudentId]);
    }
    const initialList = initialClassId && initialClassId !== 'all'
      ? students.filter((s) => s.classId === initialClassId)
      : students;
    return new Set(initialList.map((s) => s.id));
  });

  const filteredStudents = students.filter((s) => {
    return selectedClassId === 'all' || s.classId === selectedClassId;
  });

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredStudents.forEach((s) => next.add(s.id));
    setSelectedIds(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredStudents.forEach((s) => next.delete(s.id));
    setSelectedIds(next);
  };

  const studentsToPrint = students.filter((s) => selectedIds.has(s.id));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm overflow-hidden">
      {/* Top Header Toolbar (Hidden during print) */}
      <div className="no-print bg-slate-950 text-white px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Printable Student ID Cards Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ISO-standard high-resolution QR badges ready for A4 sheet printing or direct PDF export.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Class Filter */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-400">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-800 text-white">All Classes ({students.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                  {c.name} - {c.section}
                </option>
              ))}
            </select>
          </div>

          {/* Layout Orientation */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setCardLayout('horizontal')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                cardLayout === 'horizontal' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Landscape (CR80)
            </button>
            <button
              onClick={() => setCardLayout('vertical')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                cardLayout === 'vertical' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Portrait Badge
            </button>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showGuardian}
              onChange={(e) => setShowGuardian(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
            />
            <span>Guardian</span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showAdmission}
              onChange={(e) => setShowAdmission(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
            />
            <span>Adm No</span>
          </label>

          {/* Print Trigger */}
          <button
            onClick={handlePrint}
            disabled={studentsToPrint.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold shadow-md transition-all ${
              studentsToPrint.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print {studentsToPrint.length} Card{studentsToPrint.length === 1 ? '' : 's'}</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container: Split preview and selection */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer: Student Checkbox Roster (Hidden during print) */}
        <div className="no-print w-80 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">
                Selected: {studentsToPrint.length} / {filteredStudents.length}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={selectAllFiltered}
                  className="text-emerald-400 hover:underline"
                >
                  All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={deselectAllFiltered}
                  className="text-slate-400 hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredStudents.map((st) => {
                const isSelected = selectedIds.has(st.id);
                const cls = classMap.get(st.classId);
                return (
                  <div
                    key={st.id}
                    onClick={() => toggleSelectStudent(st.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/60 border border-emerald-600/80 text-emerald-100'
                        : 'bg-slate-900/50 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold truncate">{st.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Roll: {st.rollNumber} · {cls ? `${cls.name}-${cls.section}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Printing Guidelines:</p>
            <p>• Standard A4 layout fits up to 8 cards per sheet.</p>
            <p>• Set printer Margins to "None" or "Default".</p>
            <p>• Enable "Background graphics" in browser print dialog.</p>
          </div>
        </div>

        {/* Right Area: Printable Canvas Sheet View */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-900/50">
          {studentsToPrint.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Printer className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-base font-semibold text-slate-300">No cards selected</p>
              <p className="text-xs">Select students from the left roster to populate the printable ID sheet.</p>
            </div>
          ) : (
            <div
              className="bg-white p-6 shadow-2xl rounded-sm print-sheet"
              style={{
                width: '210mm',
                minHeight: '297mm',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Optional Sheet Top Header (useful for teachers distributing cards) */}
              <div className="pb-4 mb-4 border-b border-slate-300 flex items-center justify-between text-xs text-slate-700">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                    {school?.name || 'SchoolSync'} — Student Identity Cards
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Academic Year {school?.academicYear || '2026-2027'} · Total Cards: {studentsToPrint.length}
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <p>A4 Batch Layout</p>
                  <p>Cut along borders</p>
                </div>
              </div>

              {/* Grid of ID cards */}
              <div
                className={`grid gap-4 items-center justify-items-center ${
                  cardLayout === 'horizontal'
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
                }`}
              >
                {studentsToPrint.map((student) => (
                  <div
                    key={student.id}
                    className="p-1 rounded border border-dashed border-slate-300 relative group"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <StudentIDCard
                      student={student}
                      school={school}
                      classGrade={classMap.get(student.classId)}
                      layout={cardLayout}
                      showGuardian={showGuardian}
                      showAdmission={showAdmission}
                      isPrintPreview
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
