import React, { useEffect, useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  QrCode,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  GraduationCap,
  Printer,
  ShieldAlert,
  ArrowRightLeft,
  FileSpreadsheet,
  Camera,
  Calendar,
  RefreshCw,
  Check,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Student, ClassGrade, User, School } from '../../types';
import { schoolService } from '../../services/schoolService';
import { StudentIDCard } from '../common/StudentIDCard';
import { PrintableIDCardsSheet } from '../common/PrintableIDCardsSheet';
import { StudentIDCardGenerator } from '../common/StudentIDCardGenerator';
import { StudentDetailsModal } from '../common/StudentDetailsModal';

interface StudentsScreenProps {
  currentUser: User;
  school?: School | null;
  initialClassId?: string;
  onOpenScanner?: (classId: string) => void;
}

export const StudentsScreen: React.FC<StudentsScreenProps> = ({
  currentUser,
  school = null,
  initialClassId,
  onOpenScanner,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Newly created student link for quick preview/print
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState<Student | null>(null);

  // Form Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formRollNumber, setFormRollNumber] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female' | 'other'>('male');
  const [formGuardianName, setFormGuardianName] = useState('');
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formAdmissionNumber, setFormAdmissionNumber] = useState('');
  const [formAdmissionDate, setFormAdmissionDate] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'transferred'>('active');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Single Card Preview & Print Modal
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewLayout, setPreviewLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  // Detailed Student View Modal
  const [detailedStudent, setDetailedStudent] = useState<Student | null>(null);

  // Dedicated Student ID Card Generator & Print Studio Modal
  const [generatorStudent, setGeneratorStudent] = useState<Student | null>(null);

  // Full Batch Printing Sheet Modal
  const [showPrintStudio, setShowPrintStudio] = useState(false);
  const [printStudioClassId, setPrintStudioClassId] = useState<string>('all');

  // Revoke & Replace Credential Modal
  const [revokingStudent, setRevokingStudent] = useState<Student | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Controlled Class Transfer Modal
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState('');
  const [transferNewRoll, setTransferNewRoll] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Delete Confirmation
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Bulk CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [importParsedRows, setImportParsedRows] = useState<{
    rowNumber: number;
    rollNumber: string;
    fullName: string;
    gender: 'male' | 'female' | 'other';
    guardianName: string;
    guardianPhone: string;
    admissionNumber: string;
    status: 'valid' | 'invalid' | 'duplicate';
    error?: string;
  }[]>([]);
  const [importStep, setImportStep] = useState<'input' | 'preview'>('input');
  const [importResultSummary, setImportResultSummary] = useState<{ added: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allClasses, allStudents] = await Promise.all([
        schoolService.getClasses(),
        schoolService.getStudents(),
      ]);
      setClasses(allClasses);
      setStudents(allStudents);
      if (allClasses.length > 0 && !formClassId) {
        setFormClassId(allClasses[0].id);
        setImportClassId(allClasses[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  // Open Add Student Modal
  const openAddModal = (defaultClass?: string) => {
    setEditingStudent(null);
    setFormRollNumber('');
    setFormFullName('');
    setFormGender('male');
    setFormGuardianName('');
    setFormGuardianPhone('');
    setFormAdmissionNumber('');
    setFormAdmissionDate(new Date().toISOString().split('T')[0]);
    setFormDob('');
    setFormBloodGroup('');
    setFormAddress('');
    setFormStatus('active');
    setFormPhotoUrl(undefined);
    setFieldErrors({});
    setFormClassId(defaultClass || (selectedClassId !== 'all' ? selectedClassId : classes[0]?.id || ''));
    setShowFormModal(true);
  };

  // Open Edit Modal
  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormRollNumber(s.rollNumber);
    setFormFullName(s.fullName);
    setFormGender(s.gender);
    setFormGuardianName(s.guardianName);
    setFormGuardianPhone(s.guardianPhone);
    setFormAdmissionNumber(s.admissionNumber || '');
    setFormAdmissionDate(s.admissionDate || '');
    setFormDob(s.dob || '');
    setFormBloodGroup(s.bloodGroup || '');
    setFormAddress(s.address || '');
    setFormStatus(s.enrollmentStatus);
    setFormClassId(s.classId);
    setFormPhotoUrl(s.photoUrl);
    setFieldErrors({});
    setShowFormModal(true);
  };

  // Photo file picker handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, photo: 'File must be a valid image.' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, photo: 'Image size must be under 2MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormPhotoUrl(reader.result as string);
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.photo;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // Form Save Handler
  const handleSaveStudent = async (addAnother = false) => {
    setErrorMessage(null);
    const errors: Record<string, string> = {};

    const cleanRoll = formRollNumber.trim();
    const cleanName = formFullName.trim();

    if (!cleanRoll) {
      errors.rollNumber = 'Roll number is required (e.g. 0001). Leading zeros are preserved.';
    }
    if (!cleanName) {
      errors.fullName = 'Student full name is required.';
    }
    if (!formClassId) {
      errors.classId = 'Please select a class and section.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setFieldErrors({});

      let saved: Student;
      if (editingStudent) {
        saved = await schoolService.updateStudent(editingStudent.id, {
          rollNumber: cleanRoll,
          fullName: cleanName,
          gender: formGender,
          guardianName: formGuardianName.trim() || 'Parent / Guardian',
          guardianPhone: formGuardianPhone.trim(),
          classId: formClassId,
          admissionNumber: formAdmissionNumber.trim() || undefined,
          admissionDate: formAdmissionDate || undefined,
          dob: formDob || undefined,
          bloodGroup: formBloodGroup || undefined,
          address: formAddress.trim() || undefined,
          photoUrl: formPhotoUrl,
          enrollmentStatus: formStatus,
        });
        setSuccessMessage(`Student ${saved.fullName} (Roll: ${saved.rollNumber}) updated successfully.`);
      } else {
        saved = await schoolService.createStudent({
          rollNumber: cleanRoll,
          fullName: cleanName,
          gender: formGender,
          guardianName: formGuardianName.trim() || 'Parent / Guardian',
          guardianPhone: formGuardianPhone.trim(),
          classId: formClassId,
          admissionNumber: formAdmissionNumber.trim() || undefined,
          admissionDate: formAdmissionDate || undefined,
          dob: formDob || undefined,
          bloodGroup: formBloodGroup || undefined,
          address: formAddress.trim() || undefined,
          photoUrl: formPhotoUrl,
          enrollmentStatus: formStatus,
        });
        setNewlyCreatedStudent(saved);
        setSuccessMessage(`New student ${saved.fullName} (Roll: ${saved.rollNumber}) registered with unique QR credential.`);
      }

      await loadData();

      if (addAnother) {
        // Fast reset for next student in same class
        setEditingStudent(null);
        setFormRollNumber('');
        setFormFullName('');
        setFormGuardianName('');
        setFormGuardianPhone('');
        setFormAdmissionNumber('');
        setFormDob('');
        setFormBloodGroup('');
        setFormAddress('');
        setFormPhotoUrl(undefined);
      } else {
        setShowFormModal(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save student.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke and Replace Credential Handler
  const handleConfirmRevoke = async () => {
    if (!revokingStudent) return;
    if (!revokeReason.trim()) {
      setErrorMessage('A reason for credential revocation is required for the school audit log.');
      return;
    }

    try {
      setErrorMessage(null);
      const { student: updated, newCredentialId } = await schoolService.revokeAndReplaceCredential(
        revokingStudent.id,
        revokeReason.trim()
      );
      setSuccessMessage(
        `Old credential revoked. Replacement card credential issued for ${updated.fullName} (CID: ${newCredentialId.substring(0, 14)}). All attendance history preserved.`
      );
      setRevokingStudent(null);
      setRevokeReason('');
      setPreviewStudent(updated);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke credential.';
      setErrorMessage(message);
    }
  };

  // Controlled Class Transfer Handler
  const handleConfirmTransfer = async () => {
    if (!transferringStudent) return;
    if (!transferTargetClassId) {
      setErrorMessage('Please select target class for student transfer.');
      return;
    }

    try {
      setErrorMessage(null);
      const updated = await schoolService.transferStudent({
        studentId: transferringStudent.id,
        targetClassId: transferTargetClassId,
        newRollNumber: transferNewRoll.trim() || undefined,
        reason: transferReason.trim() || 'Class re-allocation',
      });
      setSuccessMessage(
        `Student ${updated.fullName} transferred to new class successfully. Historical attendance in previous classes remains intact.`
      );
      setTransferringStudent(null);
      setTransferTargetClassId('');
      setTransferNewRoll('');
      setTransferReason('');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transfer failed.';
      setErrorMessage(message);
    }
  };

  // Re-print Card Handler
  const handleReprintCard = async (student: Student) => {
    try {
      const updated = await schoolService.reprintCard(student.id);
      setSuccessMessage(`ID card reprint recorded for ${updated.fullName}.`);
      setPreviewStudent(updated);
      await loadData();
      setTimeout(() => {
        window.print();
      }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record card reprint.';
      setErrorMessage(message);
    }
  };

  // Delete Student Handler
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await schoolService.deleteStudent(studentToDelete.id);
      setSuccessMessage(`Student ${studentToDelete.fullName} removed.`);
      setStudentToDelete(null);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete student.';
      setErrorMessage(message);
      setStudentToDelete(null);
    }
  };

  // CSV Template Downloader
  const handleDownloadCsvTemplate = () => {
    const headers = 'RollNumber,FullName,FatherOrGuardianName,GuardianPhone,Gender,AdmissionNumber,DOB';
    const sampleRows = [
      '"0001","Benjamin Tyler Hayes","Claire Hayes","+44 7911 000001","male","ADM-10A-0001","2010-05-12"',
      '"0002","Charlotte Emily Clarke","David Clarke","+44 7911 000002","female","ADM-10A-0002","2010-08-20"',
      '"0003","Daniel Joseph Vance","Sarah Vance","+44 7911 000003","male","ADM-10A-0003","2010-11-04"',
    ];
    const content = [headers, ...sampleRows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SchoolSync_Student_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Upload Reader
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text);
      parseAndValidateCsv(text, importClassId);
    };
    reader.readAsText(file);
  };

  // CSV Parser & Row Validator
  const parseAndValidateCsv = (csvText: string, classId: string) => {
    const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setImportParsedRows([]);
      return;
    }

    const existingClassStudents = students.filter((s) => s.classId === classId);
    const existingRolls = new Set(existingClassStudents.map((s) => s.rollNumber.toLowerCase()));
    const existingAdmissions = new Set(
      students.filter((s) => s.admissionNumber).map((s) => s.admissionNumber!.toLowerCase())
    );

    const startIndex = lines[0].toLowerCase().includes('roll') ? 1 : 0;
    const seenRollsInFile = new Set<string>();

    const parsed: typeof importParsedRows = [];

    for (let i = startIndex; i < lines.length; i++) {
      // Regex CSV splitter handling quoted values
      const parts = lines[i].match(/(?:[^\s",]+|"[^"]*")+/g)?.map((val) => val.replace(/^"|"$/g, '').trim()) || [];
      const rollNumber = parts[0] || '';
      const fullName = parts[1] || '';
      const guardianName = parts[2] || 'Parent / Guardian';
      const guardianPhone = parts[3] || '';
      const genderRaw = parts[4]?.toLowerCase();
      const gender = genderRaw === 'female' ? 'female' : genderRaw === 'other' ? 'other' : 'male';
      const admissionNumber = parts[5] || '';

      const rowNumber = i + 1;

      if (!rollNumber) {
        parsed.push({
          rowNumber,
          rollNumber,
          fullName,
          gender,
          guardianName,
          guardianPhone,
          admissionNumber,
          status: 'invalid',
          error: 'Missing roll number.',
        });
        continue;
      }

      if (!fullName) {
        parsed.push({
          rowNumber,
          rollNumber,
          fullName,
          gender,
          guardianName,
          guardianPhone,
          admissionNumber,
          status: 'invalid',
          error: 'Missing student name.',
        });
        continue;
      }

      if (seenRollsInFile.has(rollNumber.toLowerCase())) {
        parsed.push({
          rowNumber,
          rollNumber,
          fullName,
          gender,
          guardianName,
          guardianPhone,
          admissionNumber,
          status: 'duplicate',
          error: `Roll "${rollNumber}" repeated within file.`,
        });
        continue;
      }

      if (existingRolls.has(rollNumber.toLowerCase())) {
        parsed.push({
          rowNumber,
          rollNumber,
          fullName,
          gender,
          guardianName,
          guardianPhone,
          admissionNumber,
          status: 'duplicate',
          error: `Roll "${rollNumber}" already exists in class.`,
        });
        continue;
      }

      if (admissionNumber && existingAdmissions.has(admissionNumber.toLowerCase())) {
        parsed.push({
          rowNumber,
          rollNumber,
          fullName,
          gender,
          guardianName,
          guardianPhone,
          admissionNumber,
          status: 'duplicate',
          error: `Admission ID "${admissionNumber}" already in use.`,
        });
        continue;
      }

      seenRollsInFile.add(rollNumber.toLowerCase());
      parsed.push({
        rowNumber,
        rollNumber,
        fullName,
        gender,
        guardianName,
        guardianPhone,
        admissionNumber,
        status: 'valid',
      });
    }

    setImportParsedRows(parsed);
    setImportStep('preview');
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    const validRows = importParsedRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) return;

    try {
      const res = await schoolService.bulkImportStudents(importClassId, validRows);
      setImportResultSummary({ added: res.added, errors: res.errors });
      setSuccessMessage(`Successfully imported ${res.added} students into class roster.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setImportResultSummary({ added: 0, errors: [message] });
    }
  };

  // Filter students
  const filteredStudents = students.filter((st) => {
    const matchesClass = selectedClassId === 'all' || st.classId === selectedClassId;
    const matchesStatus = selectedStatus === 'all' || st.enrollmentStatus === selectedStatus;
    const matchesSearch =
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.admissionNumber && st.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      st.guardianName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesStatus && matchesSearch;
  });

  const getClassName = (classId: string) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} - Sec ${c.section}` : 'N/A';
  };

  const currentClassObj = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
              {school?.name || 'SchoolSync'}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              STUDENT MANAGEMENT & CREDENTIALS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Student Directory & QR Cards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Offline enrollment, zero-padded roll numbers, machine-readable QR ID cards, and credential lifecycle.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'principal' && (
            <>
              <button
                onClick={() => {
                  setPrintStudioClassId(selectedClassId);
                  setShowPrintStudio(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                title="Batch print student ID cards on A4 sheets"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                <span>Print ID Cards Studio</span>
              </button>

              <button
                onClick={() => {
                  setImportStep('input');
                  setImportParsedRows([]);
                  setImportResultSummary(null);
                  setImportCsvText(
                    'RollNumber,FullName,FatherOrGuardianName,GuardianPhone,Gender,AdmissionNumber\n0001,Benjamin Tyler Hayes,Claire Hayes,+44 7911 000001,male,ADM-10A-0001\n0002,Charlotte Emily Clarke,David Clarke,+44 7911 000002,female,ADM-10A-0002'
                  );
                  setShowImportModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Bulk Import CSV</span>
              </button>

              <button
                onClick={() => openAddModal()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Register Student</span>
              </button>
            </>
          )}

          {onOpenScanner && selectedClassId !== 'all' && (
            <button
              onClick={() => onOpenScanner(selectedClassId)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
            {newlyCreatedStudent && (
              <button
                onClick={() => setPreviewStudent(newlyCreatedStudent)}
                className="ml-3 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
              >
                Preview & Print ID Card →
              </button>
            )}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, roll no (0001), guardian, or admission ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs shadow-sm">
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Classes ({students.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Sec {c.section} ({c.studentCount || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs shadow-sm">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="transferred">Transferred</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums text-right">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No student records found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or register a new learner.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-24">Roll No</th>
                  <th className="py-2.5 px-4">Student Details</th>
                  <th className="py-2.5 px-4">Class & Section</th>
                  <th className="py-2.5 px-4">Father / Guardian</th>
                  <th className="py-2.5 px-4">Admission ID</th>
                  <th className="py-2.5 px-4">Card Credential</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Roll Number with preserved leading zeros */}
                    <td
                      onClick={() => setDetailedStudent(st)}
                      className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900 cursor-pointer hover:text-emerald-700 hover:underline"
                      title="Click to view full student details and print ID card"
                    >
                      {String(st.rollNumber).padStart(4, '0')}
                    </td>

                    {/* Student Full Name & Avatar */}
                    <td
                      onClick={() => setDetailedStudent(st)}
                      className="py-3 px-4 cursor-pointer group"
                      title="Click to view full student details and print ID card"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-emerald-500 transition-colors">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 uppercase font-mono">
                              {st.fullName.substring(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight group-hover:text-emerald-700 group-hover:underline transition-colors">
                            {st.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {st.gender} {st.admissionDate ? `· Admitted ${st.admissionDate}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Class & Section */}
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {getClassName(st.classId)}
                    </td>

                    {/* Father / Guardian Contact */}
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-medium text-slate-900 block">{st.guardianName}</span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {st.guardianPhone || 'No contact'}
                      </span>
                    </td>

                    {/* Admission ID */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {st.admissionNumber || '—'}
                    </td>

                    {/* Credential Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            st.enrollmentStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : st.enrollmentStatus === 'transferred'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.enrollmentStatus === 'active' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          {st.enrollmentStatus}
                        </span>
                        {st.activeCredentialId && (
                          <span className="block text-[9px] font-mono text-slate-400">
                            {st.activeCredentialId.substring(0, 14)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Student Details View Modal */}
                        <button
                          onClick={() => setDetailedStudent(st)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View Student Details (Print ID Card, Demographics, Attendance)"
                        >
                          <UserCheck className="w-4 h-4 text-slate-700" />
                        </button>

                        {/* Open Dedicated ID Card Generator & Print Studio */}
                        <button
                          onClick={() => setGeneratorStudent(st)}
                          className="p-1.5 rounded hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                          title="Generate & Print Student ID Card"
                        >
                          <QrCode className="w-4 h-4 text-emerald-700" />
                        </button>

                        {currentUser.role === 'principal' && (
                          <>
                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(st)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                              title="Edit Student Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Transfer Student */}
                            <button
                              onClick={() => {
                                setTransferringStudent(st);
                                setTransferTargetClassId(classes.find((c) => c.id !== st.classId)?.id || '');
                                setTransferNewRoll(st.rollNumber);
                                setTransferReason('');
                              }}
                              className="p-1.5 rounded hover:bg-sky-50 text-slate-600 hover:text-sky-700 transition-colors"
                              title="Transfer to Another Class (Preserves Attendance History)"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                            </button>

                            {/* Revoke & Replace Card */}
                            <button
                              onClick={() => {
                                setRevokingStudent(st);
                                setRevokeReason('');
                              }}
                              className="p-1.5 rounded hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors"
                              title="Revoke Lost Card & Issue Replacement Credential"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setStudentToDelete(st)}
                              className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Student Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStudent ? 'Edit Student Record' : 'Register New Student'}
                </h3>
                <p className="text-xs text-slate-500">
                  Leading zeros in roll numbers are preserved. A unique QR credential will be generated automatically.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Photo Upload Strip */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-16 h-16 rounded-full border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {formPhotoUrl ? (
                    <img src={formPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">
                    Student Photograph (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Uploaded locally and printed directly on the student ID card.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold cursor-pointer">
                      <span>Choose Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl(undefined)}
                        className="px-2 py-1 text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {fieldErrors.photo && (
                    <p className="text-rose-600 text-[11px]">{fieldErrors.photo}</p>
                  )}
                </div>
              </div>

              {/* Core Required Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRollNumber}
                    onChange={(e) => setFormRollNumber(e.target.value)}
                    placeholder="0001"
                    className="w-full p-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                  {fieldErrors.rollNumber ? (
                    <p className="text-rose-600 text-[11px] mt-0.5">{fieldErrors.rollNumber}</p>
                  ) : (
                    <p className="text-slate-400 text-[10px] mt-0.5">Preserves leading zeros (e.g. 0001, 0042)</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Full Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="e.g. Benjamin Tyler Hayes"
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                  {fieldErrors.fullName && (
                    <p className="text-rose-600 text-[11px] mt-0.5">{fieldErrors.fullName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Class & Section *
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - Section {c.section}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.classId && (
                    <p className="text-rose-600 text-[11px] mt-0.5">{fieldErrors.classId}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Father's / Guardian's Full Name *
                  </label>
                  <input
                    type="text"
                    value={formGuardianName}
                    onChange={(e) => setFormGuardianName(e.target.value)}
                    placeholder="e.g. Claire Hayes"
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Guardian Phone Contact
                  </label>
                  <input
                    type="tel"
                    value={formGuardianPhone}
                    onChange={(e) => setFormGuardianPhone(e.target.value)}
                    placeholder="+44 7911 000000"
                    className="w-full p-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Optional Configurable School Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={formAdmissionNumber}
                    onChange={(e) => setFormAdmissionNumber(e.target.value)}
                    placeholder="ADM-10A-0001"
                    className="w-full p-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Date of Admission</label>
                  <input
                    type="date"
                    value={formAdmissionDate}
                    onChange={(e) => setFormAdmissionDate(e.target.value)}
                    className="w-full p-2 font-mono rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Enrollment Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive' | 'transferred')}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {!editingStudent && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSaveStudent(true)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Save & Add Another
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveStudent(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-md transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Save Student'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Card Preview & Print Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-center my-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Official Student ID Badge
              </span>
              <button onClick={() => setPreviewStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Layout switch */}
            <div className="flex items-center justify-center gap-2 pb-1">
              <button
                onClick={() => setPreviewLayout('horizontal')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  previewLayout === 'horizontal' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                CR80 Landscape
              </button>
              <button
                onClick={() => setPreviewLayout('vertical')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  previewLayout === 'vertical' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Portrait Badge
              </button>
            </div>

            {/* Card Render */}
            <div className="flex justify-center p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
              <StudentIDCard
                student={previewStudent}
                school={school}
                classGrade={classes.find((c) => c.id === previewStudent.classId)}
                layout={previewLayout}
              />
            </div>

            {/* Security Audit Details */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left font-mono space-y-0.5">
              <p className="truncate">
                <strong className="font-sans text-slate-700">Active Credential:</strong> {previewStudent.activeCredentialId || 'Default'}
              </p>
              <p>
                <strong className="font-sans text-slate-700">Issued:</strong>{' '}
                {previewStudent.cardIssuedAt ? new Date(previewStudent.cardIssuedAt).toLocaleString() : 'Active'}
              </p>
              {previewStudent.lastReplacedReason && (
                <p className="text-amber-700">
                  <strong className="font-sans">Last Replaced:</strong> {previewStudent.lastReplacedReason}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => {
                  const s = previewStudent;
                  setPreviewStudent(null);
                  setGeneratorStudent(s);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open Full ID Card Generator & Print Studio</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleReprintCard(previewStudent)}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Quick Print</span>
                </button>

                <button
                  onClick={() => {
                    const s = previewStudent;
                    setPreviewStudent(null);
                    setRevokingStudent(s);
                    setRevokeReason('');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Revoke & Replace</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke & Replace Credential Modal */}
      {revokingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Revoke Lost Card & Issue New Credential</h3>
                <p className="text-xs text-slate-500">Student: {revokingStudent.fullName} (Roll: {revokingStudent.rollNumber})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-200">
              <strong>Security Protocol:</strong> The current QR barcode will be permanently revoked. If the old card is presented to the attendance scanner, it will be rejected as revoked. All past attendance records remain preserved.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-800 block">
                Required Audit Reason (e.g. Card lost on commute, damaged barcode) *
              </label>
              <textarea
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Reason for revoking credential and generating replacement card..."
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-600 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRevokingStudent(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Confirm Revocation & Issue Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Class Transfer Modal */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-sky-600">
              <ArrowRightLeft className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Controlled Student Class Transfer</h3>
                <p className="text-xs text-slate-500">Learner: {transferringStudent.fullName} (Current: {getClassName(transferringStudent.classId)})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-sky-50 p-3 rounded-lg border border-sky-200">
              <strong>Audit Guarantee:</strong> When changing class or section, all historical attendance records from previous dates remain certified under the original class. No historical data will be erased.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Destination Class & Section *
                </label>
                <select
                  value={transferTargetClassId}
                  onChange={(e) => setTransferTargetClassId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Section {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  New Roll Number in Destination Class
                </label>
                <input
                  type="text"
                  value={transferNewRoll}
                  onChange={(e) => setTransferNewRoll(e.target.value)}
                  placeholder="0001"
                  className="w-full p-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Administrative Transfer Justification
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Promoted to section B; Academic re-grouping"
                  className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setTransferringStudent(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Execute Controlled Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bulk Student Registration via CSV</h3>
                <p className="text-xs text-slate-500">
                  Pre-validates leading zeros, prevents duplicate registrations, and creates versioned QR credentials.
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importStep === 'input' ? (
              <div className="space-y-4 text-xs">
                {/* Target Class & Template Download */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Target Class:</span>
                    <select
                      value={importClassId}
                      onChange={(e) => setImportClassId(e.target.value)}
                      className="p-1.5 rounded border border-slate-300 bg-white font-medium"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - Section {c.section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleDownloadCsvTemplate}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {/* File Upload Selector */}
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center space-y-2 bg-slate-50/50">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-700">Upload CSV Spreadsheet</p>
                  <p className="text-[11px] text-slate-500">
                    Supports comma-delimited text. Notice: Format roll columns as text in Excel to preserve leading zeros.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Select .csv File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      ref={fileInputRef}
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Direct Paste Area */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Or Paste CSV Data Directly (Header: RollNumber, FullName, FatherOrGuardianName, GuardianPhone, Gender, AdmissionNumber)
                  </label>
                  <textarea
                    rows={6}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    className="w-full p-2.5 font-mono text-[11px] rounded border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => parseAndValidateCsv(importCsvText, importClassId)}
                    disabled={!importCsvText.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    Validate CSV Rows →
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Pre-Validation Review */
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900">Validation Summary:</span>{' '}
                    <span className="text-emerald-700 font-bold">
                      {importParsedRows.filter((r) => r.status === 'valid').length} valid
                    </span>{' '}
                    ·{' '}
                    <span className="text-rose-700 font-bold">
                      {importParsedRows.filter((r) => r.status !== 'valid').length} flagged
                    </span>
                  </div>
                  <button
                    onClick={() => setImportStep('input')}
                    className="text-slate-600 hover:underline"
                  >
                    ← Edit Data
                  </button>
                </div>

                {/* Table of detected rows */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                        <th className="p-2">Row</th>
                        <th className="p-2">Roll</th>
                        <th className="p-2">Full Name</th>
                        <th className="p-2">Guardian</th>
                        <th className="p-2">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {importParsedRows.map((r, idx) => (
                        <tr key={idx} className={r.status === 'valid' ? 'bg-white' : 'bg-rose-50/50'}>
                          <td className="p-2 font-mono">{r.rowNumber}</td>
                          <td className="p-2 font-mono font-bold text-slate-900">{r.rollNumber}</td>
                          <td className="p-2 font-semibold text-slate-900">{r.fullName}</td>
                          <td className="p-2 text-slate-600">{r.guardianName}</td>
                          <td className="p-2">
                            {r.status === 'valid' ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Valid
                              </span>
                            ) : (
                              <span className="text-rose-700 font-medium">
                                ⚠ {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importResultSummary && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    importResultSummary.added > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <p className="font-bold">
                      Import Finished: {importResultSummary.added} student(s) enrolled successfully.
                    </p>
                    {importResultSummary.errors.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {importResultSummary.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Done
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importParsedRows.filter((r) => r.status === 'valid').length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    Confirm & Enroll {importParsedRows.filter((r) => r.status === 'valid').length} Students
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Permanent Record Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{studentToDelete.fullName}</strong> (Roll: {studentToDelete.rollNumber})?
            </p>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
              Note: Students with verified attendance history cannot be permanently deleted to protect legal audit records. Consider marking status as <em>Transferred</em> or <em>Inactive</em> instead.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Multi-Card Print Studio */}
      {showPrintStudio && (
        <PrintableIDCardsSheet
          students={students}
          school={school}
          classes={classes}
          initialClassId={printStudioClassId}
          onClose={() => setShowPrintStudio(false)}
        />
      )}

      {/* Comprehensive Student Details View Modal */}
      {detailedStudent && (
        <StudentDetailsModal
          student={detailedStudent}
          school={school}
          classGrade={classes.find((c) => c.id === detailedStudent.classId)}
          classes={classes}
          currentUser={currentUser}
          onClose={() => setDetailedStudent(null)}
          onPrintCard={(st) => {
            setDetailedStudent(null);
            setGeneratorStudent(st);
          }}
          onEditStudent={(st) => {
            setDetailedStudent(null);
            openEditModal(st);
          }}
          onTransferStudent={(st) => {
            setDetailedStudent(null);
            setTransferringStudent(st);
            setTransferTargetClassId(classes.find((c) => c.id !== st.classId)?.id || '');
            setTransferNewRoll(st.rollNumber);
            setTransferReason('');
          }}
          onRevokeCredential={(st) => {
            setDetailedStudent(null);
            setRevokingStudent(st);
            setRevokeReason('');
          }}
        />
      )}

      {/* Dedicated Student ID Card Generator & Print Studio Modal */}
      {generatorStudent && (
        <StudentIDCardGenerator
          student={generatorStudent}
          school={school}
          classGrade={classes.find((c) => c.id === generatorStudent.classId)}
          classes={classes}
          onClose={() => setGeneratorStudent(null)}
        />
      )}
    </div>
  );
};
