import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Users,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Building,
  UserCheck
} from 'lucide-react';
import { ClassGrade, Teacher, School } from '../../types';
import { schoolService } from '../../services/schoolService';

interface ClassesScreenProps {
  school: School | null;
  onViewClassStudents?: (classId: string) => void;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = ({ school, onViewClassStudents }) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGrade | null>(null);
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('A');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formAssignedTeacherId, setFormAssignedTeacherId] = useState('');
  const [formCapacity, setFormCapacity] = useState('30');
  const [classToDelete, setClassToDelete] = useState<ClassGrade | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allClasses, allTeachers] = await Promise.all([
        schoolService.getClasses(),
        schoolService.getTeachers(),
      ]);
      setClasses(allClasses);
      setTeachers(allTeachers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormSection('A');
    setFormRoomNumber('');
    setFormAssignedTeacherId('');
    setFormCapacity('30');
    setShowModal(true);
  };

  const openEditModal = (c: ClassGrade) => {
    setEditingClass(c);
    setFormName(c.name);
    setFormSection(c.section);
    setFormRoomNumber(c.roomNumber || '');
    setFormAssignedTeacherId(c.assignedTeacherId || '');
    setFormCapacity(String(c.capacity || 30));
    setShowModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formName.trim() || !formSection.trim()) {
      setErrorMessage('Class name (e.g. Grade 10) and Section (e.g. A) are required.');
      return;
    }

    try {
      const academicYear = school?.academicYear || '2026-2027';

      if (editingClass) {
        await schoolService.updateClass(editingClass.id, {
          name: formName.trim(),
          section: formSection.trim().toUpperCase(),
          roomNumber: formRoomNumber.trim() || undefined,
          assignedTeacherId: formAssignedTeacherId || undefined,
          capacity: parseInt(formCapacity, 10) || 30,
        });
        setSuccessMessage(`Class "${formName} - ${formSection}" updated.`);
      } else {
        await schoolService.createClass({
          name: formName.trim(),
          section: formSection.trim().toUpperCase(),
          academicYear,
          roomNumber: formRoomNumber.trim() || undefined,
          assignedTeacherId: formAssignedTeacherId || undefined,
          capacity: parseInt(formCapacity, 10) || 30,
        });
        setSuccessMessage(`New class "${formName} - ${formSection}" registered.`);
      }

      setShowModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save class.';
      setErrorMessage(message);
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setErrorMessage(null);
      await schoolService.deleteClass(classToDelete.id);
      setSuccessMessage(`Class "${classToDelete.name} - ${classToDelete.section}" deleted.`);
      setClassToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete class.';
      setErrorMessage(message);
      setClassToDelete(null);
    }
  };

  const openAddSection = (className: string) => {
    setEditingClass(null);
    setFormName(className);
    const existingSections = classes
      .filter((c) => c.name.toLowerCase() === className.toLowerCase())
      .map((c) => c.section.toUpperCase());
    const candidates = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextSec = candidates.find((ch) => !existingSections.includes(ch)) || 'B';
    setFormSection(nextSec);
    setFormRoomNumber('');
    setFormAssignedTeacherId('');
    setFormCapacity('30');
    setShowModal(true);
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Unassigned';
    const t = teachers.find((tch) => tch.id === teacherId);
    return t ? t.fullName : 'Unassigned';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Classes & Academic Sections
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Class schedules, teacher allocations, and enrollment thresholds for {school?.name}.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Add New Class</span>
        </button>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {cls.name} · Section {cls.section}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {cls.roomNumber || 'Main Building'} · {cls.academicYear}
                  </p>
                </div>
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Enrolled Learners:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {cls.studentCount || 0} / {cls.capacity || 30}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Teacher:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[160px]">
                    {getTeacherName(cls.assignedTeacherId)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {onViewClassStudents && (
                  <button
                    onClick={() => onViewClassStudents(cls.id)}
                    className="text-emerald-800 hover:text-emerald-950 font-semibold underline underline-offset-2"
                  >
                    View Roster
                  </button>
                )}
                <button
                  onClick={() => openAddSection(cls.name)}
                  className="text-slate-600 hover:text-slate-900 font-medium text-[11px]"
                  title="Add another section to this grade"
                >
                  + Section
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(cls)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  title="Edit Class"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setClassToDelete(cls)}
                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  title="Delete Class"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Edit Class Details' : 'Create Academic Class'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Grade / Level *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Grade 10"
                    className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Section *</label>
                  <input
                    type="text"
                    required
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Room Number</label>
                  <input
                    type="text"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    placeholder="Room 204"
                    className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full p-2 font-mono rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Teacher</label>
                <select
                  value={formAssignedTeacherId}
                  onChange={(e) => setFormAssignedTeacherId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-white"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold transition-colors"
                >
                  {editingClass ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Class?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{classToDelete.name} - {classToDelete.section}</span>?
              {classToDelete.studentCount && classToDelete.studentCount > 0 ? (
                <span className="text-rose-600 font-semibold block mt-1">
                  Warning: Cannot delete while {classToDelete.studentCount} enrolled students remain.
                </span>
              ) : null}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setClassToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                disabled={(classToDelete.studentCount || 0) > 0}
                className={`px-4 py-1.5 rounded text-xs font-semibold ${
                  (classToDelete.studentCount || 0) > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
