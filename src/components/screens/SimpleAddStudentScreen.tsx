import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  Download,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  ArrowRight,
  QrCode,
  X,
  Plus
} from 'lucide-react';
import { School, ClassGrade, Student } from '../../types';
import { schoolService } from '../../services/schoolService';
import { downloadStudentIDCardPDF } from '../../services/pdfGenerator';
import { compressImage } from '../../services/imageUtils';

interface SimpleAddStudentScreenProps {
  school: School | null;
  initialClassId?: string;
  onStudentSaved?: (student: Student) => void;
  onNavigateToScan?: () => void;
  onNavigateToClasses?: () => void;
}

export const SimpleAddStudentScreen: React.FC<SimpleAddStudentScreenProps> = ({
  school,
  initialClassId,
  onStudentSaved,
  onNavigateToScan,
  onNavigateToClasses,
}) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Form fields (Strictly as specified in requirement 3)
  const [studentPhoto, setStudentPhoto] = useState<string | undefined>(undefined);
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rollNumber, setRollNumber] = useState('');
  const [address, setAddress] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ student: Student; fileName: string } | null>(null);

  // Quick Inline Add Class Modal if no classes exist or teacher wants a new class
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newHeadmasterName, setNewHeadmasterName] = useState(school?.principalName || 'Headmaster');
  const [savingClass, setSavingClass] = useState(false);

  // Load existing classes
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const list = await schoolService.getClasses();
      setClasses(list);
      if (initialClassId && list.some((c) => c.id === initialClassId)) {
        setSelectedClassId(initialClassId);
      } else if (list.length > 0 && !selectedClassId) {
        setSelectedClassId(list[0].id);
      }
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [initialClassId]);

  // Handle photo file picker or camera capture
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG or PNG).');
      return;
    }

    try {
      // Compress immediately to max 320x320 at 0.75 quality (~25KB)
      const compressedUrl = await compressImage(file, 320, 0.75);
      setStudentPhoto(compressedUrl);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Failed to process image. Please try another image.');
    }
  };

  // Quick class creator
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClassName.trim();
    if (!cleanName) {
      setErrorMessage('Class name is required.');
      return;
    }

    try {
      setSavingClass(true);
      const created = await schoolService.createClass({
        name: cleanName,
        headmasterName: newHeadmasterName.trim() || undefined,
        section: '',
        academicYear: school?.academicYear || '2026-2027',
      });
      await loadClasses();
      setSelectedClassId(created.id);
      setShowAddClassModal(false);
      setNewClassName('');
      setErrorMessage(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create class';
      setErrorMessage(message);
    } finally {
      setSavingClass(false);
    }
  };

  // Main Submit: SAVE STUDENT & DOWNLOAD PDF ID CARD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = studentName.trim();
    const cleanFather = fatherName.trim();
    const cleanRoll = rollNumber.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMessage('Student Name is required.');
      return;
    }

    if (!cleanFather) {
      setErrorMessage("Father's Name is required.");
      return;
    }

    if (!selectedClassId) {
      setErrorMessage('Please select a class. Create a class first if none exists.');
      return;
    }

    if (!cleanRoll) {
      setErrorMessage('Roll Number is required (e.g. 0001, 07). Leading zeros will be preserved.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Save student in local IndexedDB permanently
      const newStudent = await schoolService.createStudent({
        fullName: cleanName,
        guardianName: cleanFather,
        classId: selectedClassId,
        rollNumber: cleanRoll, // preserves leading zeros
        address: cleanAddress || undefined,
        photoUrl: studentPhoto,
        gender: 'male',
        guardianPhone: '',
      });

      // 2. Resolve class name & headmaster name
      const targetClass = classes.find((c) => c.id === selectedClassId);
      const classNameStr = targetClass ? targetClass.name : `Class ${selectedClassId}`;
      const schoolNameStr = school?.name || 'SchoolSync Academy';
      const headmaster = school?.principalName || 'Headmaster';

      // 3. Generate & Download PDF Student ID Card immediately
      const pdfResult = await downloadStudentIDCardPDF({
        schoolName: schoolNameStr,
        student: newStudent,
        className: classNameStr,
        headmasterName: headmaster,
        academicYear: school?.academicYear || '2026-2027',
      });

      // 4. Update state with success feedback
      setSuccessInfo({
        student: newStudent,
        fileName: pdfResult.fileName,
      });

      if (onStudentSaved) {
        onStudentSaved(newStudent);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register student';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSuccessInfo(null);
    setStudentName('');
    setFatherName('');
    setRollNumber('');
    setAddress('');
    setStudentPhoto(undefined);
    setErrorMessage(null);
  };

  const activeSelectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0B192C] flex items-center justify-center text-emerald-400 font-bold shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Add New Student
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter student details to register locally and generate their scannable PDF ID Card.
            </p>
          </div>
        </div>
      </div>

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

      {/* Success Confirmation Modal / Banner */}
      {successInfo && (
        <div className="bg-emerald-950 border-2 border-emerald-500 rounded-3xl p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shrink-0 shadow-lg">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                REGISTRATION SUCCESSFUL
              </span>
              <h2 className="text-lg font-extrabold text-white truncate mt-0.5">
                {successInfo.student.fullName}
              </h2>
              <p className="text-xs text-emerald-300">
                Roll Number: <strong className="text-white font-mono">{successInfo.student.rollNumber}</strong> · Class: <strong className="text-white">{activeSelectedClass?.name || 'Class'}</strong>
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-emerald-500/40 text-xs text-emerald-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px]">{successInfo.fileName}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 shrink-0">Downloaded ✓</span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            The printable ID card has been downloaded to your phone's <strong>Downloads</strong> folder. The student is saved locally and can now be scanned for attendance.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleResetForAnother}
              className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              + Add Another Student
            </button>
            {onNavigateToScan && (
              <button
                onClick={onNavigateToScan}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <span>Start Scanning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Form (Section 3: Simple Form) */}
      {!successInfo && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          
          {/* 1. Student Picture (Take or choose from phone) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Student Picture
            </label>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {studentPhoto ? (
                  <img src={studentPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-xs text-slate-600 font-medium leading-tight">
                  Take a photo or select an image from your device.
                </p>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Choose / Take Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {studentPhoto && (
                    <button
                      type="button"
                      onClick={() => setStudentPhoto(undefined)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Student Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Student Name *
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Ahmad Khan"
              className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* 3. Father’s Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Father’s Name *
            </label>
            <input
              type="text"
              required
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="e.g. Tariq Khan"
              className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* 4. Class Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Class *
              </label>
              <button
                type="button"
                onClick={() => setShowAddClassModal(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Class</span>
              </button>
            </div>

            {loadingClasses ? (
              <div className="p-3 text-xs text-slate-400">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <span>No classes exist yet. Tap "Add New Class" above.</span>
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(true)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold"
                >
                  Create Class
                </button>
              </div>
            ) : (
              <select
                required
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold text-slate-900 shadow-xs cursor-pointer"
              >
                <option value="" disabled>Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 5. Roll Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Roll Number *
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 0001 or 07"
              className="w-full p-3.5 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-mono font-bold text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
            <p className="text-[11px] text-slate-400">
              Leading zeros are preserved exactly (e.g. 0001, 0042).
            </p>
          </div>

          {/* 6. Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House 14, Main Road, City"
              className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* ONE MAIN BUTTON (Specified in Requirement 3) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white rounded-2xl font-extrabold text-sm tracking-wide shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>
                {submitting ? 'SAVING & GENERATING PDF...' : 'SAVE STUDENT & DOWNLOAD PDF ID CARD'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Inline Modal to Add Class */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Add New Class</h3>
              <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Grade 10 or Class 5"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Headmaster Name</label>
                <input
                  type="text"
                  value={newHeadmasterName}
                  onChange={(e) => setNewHeadmasterName(e.target.value)}
                  placeholder="e.g. Principal Khan"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-3 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-4 py-2 bg-slate-950 text-white rounded-xl font-bold shadow-sm"
                >
                  {savingClass ? 'Saving...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
