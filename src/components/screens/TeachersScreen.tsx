import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Teacher, ClassGrade } from '../../types';
import { schoolService } from '../../services/schoolService';

export const TeachersScreen: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [formAssignedClassIds, setFormAssignedClassIds] = useState<string[]>([]);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTeachers, allClasses] = await Promise.all([
        schoolService.getTeachers(),
        schoolService.getClasses(),
      ]);
      setTeachers(allTeachers);
      setClasses(allClasses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormEmployeeId(`TCH-${Math.floor(100 + Math.random() * 900)}`);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormSpecialization('');
    setFormAssignedClassIds([]);
    setShowModal(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFormEmployeeId(t.employeeId);
    setFormFullName(t.fullName);
    setFormEmail(t.email);
    setFormPhone(t.phone);
    setFormSpecialization(t.specialization || '');
    setFormAssignedClassIds(t.assignedClassIds || []);
    setShowModal(true);
  };

  const toggleClassAssignment = (classId: string) => {
    if (formAssignedClassIds.includes(classId)) {
      setFormAssignedClassIds(formAssignedClassIds.filter((id) => id !== classId));
    } else {
      setFormAssignedClassIds([...formAssignedClassIds, classId]);
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formFullName.trim() || !formEmployeeId.trim()) {
      setErrorMessage('Teacher name and Employee ID are required.');
      return;
    }

    try {
      if (editingTeacher) {
        await schoolService.updateTeacher(editingTeacher.id, {
          employeeId: formEmployeeId.trim().toUpperCase(),
          fullName: formFullName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          specialization: formSpecialization.trim() || undefined,
          assignedClassIds: formAssignedClassIds,
        });
        setSuccessMessage(`Teacher record for ${formFullName} updated.`);
      } else {
        await schoolService.createTeacher({
          employeeId: formEmployeeId.trim().toUpperCase(),
          fullName: formFullName.trim(),
          email: formEmail.trim() || `${formFullName.toLowerCase().replace(/\s+/g, '.')}@school.edu`,
          phone: formPhone.trim(),
          specialization: formSpecialization.trim() || undefined,
          assignedClassIds: formAssignedClassIds,
        });
        setSuccessMessage(`Teacher ${formFullName} (${formEmployeeId}) registered with classroom access.`);
      }

      setShowModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save teacher.';
      setErrorMessage(message);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      await schoolService.deleteTeacher(teacherToDelete.id);
      setSuccessMessage(`Teacher ${teacherToDelete.fullName} removed.`);
      setTeacherToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete teacher.';
      setErrorMessage(message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Teacher Faculty & Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Authorized classroom teachers, contact details, and assigned roll call access.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Register New Teacher</span>
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
        {teachers.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t.fullName}</h3>
                  <span className="text-xs font-mono font-medium text-emerald-800">
                    ID: {t.employeeId}
                  </span>
                  {t.specialization && (
                    <p className="text-xs text-slate-500 mt-0.5">{t.specialization}</p>
                  )}
                </div>
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{t.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{t.phone || 'No phone recorded'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Assigned Classes ({t.assignedClassIds.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {t.assignedClassIds.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No classes assigned</span>
                  ) : (
                    t.assignedClassIds.map((cid) => {
                      const c = classes.find((cl) => cl.id === cid);
                      return (
                        <span
                          key={cid}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium text-[11px]"
                        >
                          {c ? `${c.name}-${c.section}` : cid}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized Teacher</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(t)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  title="Edit Teacher"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTeacherToDelete(t)}
                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  title="Remove Teacher"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Teacher Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingTeacher ? 'Edit Teacher Profile' : 'Register New Faculty Member'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    placeholder="TCH-101"
                    className="w-full p-2 font-mono uppercase rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Specialization</label>
                  <input
                    type="text"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder="Mathematics, Science, etc."
                    className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Ms. Sarah Jenkins"
                  className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="s.jenkins@school.edu"
                    className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                    className="w-full p-2 font-mono rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Authorized Assigned Classes:
                </label>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded border border-slate-200 bg-slate-50 max-h-40 overflow-y-auto">
                  {classes.map((c) => {
                    const isChecked = formAssignedClassIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClassAssignment(c.id)}
                        className={`flex items-center justify-between p-2 rounded text-left transition-colors border ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="truncate">
                          {c.name} - {c.section}
                        </span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Teachers only have permission to open registers for checked classes.
                </p>
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
                  {editingTeacher ? 'Save Changes' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Remove Teacher?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-900">{teacherToDelete.fullName}</span>?
              Their login profile and class assignments will be revoked.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setTeacherToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
