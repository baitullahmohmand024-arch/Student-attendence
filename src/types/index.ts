/**
 * SchoolSync Data Models and Type Definitions
 * Phase 1: Professional School Attendance Management System
 */

export type UserRole = 'principal' | 'teacher';

export interface SchoolPreferences {
  cutOffTime: string; // e.g. "08:30"
  requireLeaveReason: boolean;
  allowTeacherCorrectionBeforeFinalize: boolean;
  defaultStatus: 'pending' | 'present';
  lateGraceMinutes: number;
}

export interface School {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
  country: string;
  timezone: string;
  academicYear: string; // e.g. "2026-2027"
  term: string; // e.g. "Term 1"
  workingDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  principalName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  preferences: SchoolPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  teacherProfileId?: string; // Links to teacher record if role is teacher
  isActive: boolean;
  lastLogin?: string;
}

export interface Teacher {
  id: string;
  employeeId: string; // e.g. "TCH-001"
  fullName: string;
  email: string;
  phone: string;
  assignedClassIds: string[]; // Class IDs assigned to this teacher
  specialization?: string;
  status: 'active' | 'on_leave' | 'inactive';
  createdAt: string;
}

export interface ClassGrade {
  id: string;
  name: string; // e.g. "Grade 10" or "Class 5"
  section: string; // e.g. "A" or "Blue"
  headmasterName?: string;
  roomNumber?: string;
  academicYear: string;
  assignedTeacherId?: string;
  studentCount?: number;
  capacity?: number;
  createdAt: string;
}

export interface Student {
  id: string; // Stable internal UUID
  rollNumber: string; // String with leading zeros preserved: "0001", "0042"
  fullName: string;
  gender: 'male' | 'female' | 'other';
  guardianName: string;
  guardianPhone: string;
  classId: string;
  admissionNumber?: string;
  admissionDate?: string; // Date student was admitted: "YYYY-MM-DD"
  photoUrl?: string; // Base64 or local photo asset
  enrollmentStatus: 'active' | 'inactive' | 'transferred';
  dob?: string;
  bloodGroup?: string;
  address?: string;
  qrCodeToken: string; // Serialized machine-readable QR credential payload
  activeCredentialId?: string; // Unique active credential ID (e.g. "crd_1729750000")
  revokedCredentialIds?: string[]; // Array of revoked credential IDs for lost/damaged cards
  cardIssuedAt?: string; // ISO timestamp of card issuance/reprint
  lastReplacedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentQRPayload {
  v: number; // Format version (1)
  sch: string; // School identifier
  sid: string; // Stable internal student UUID
  cid: string; // Unique credential identifier
  iat?: number; // Issued at epoch timestamp
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'sick_leave'
  | 'approved_leave'
  | 'pending'
  | 'holiday';

export type AttendanceMethod =
  | 'qr_scan'
  | 'manual_entry'
  | 'system_default'
  | 'bulk_mark';

export interface AttendanceRecord {
  id: string; // `${studentId}_${date}`
  schoolId?: string;
  academicYear?: string;
  classSection?: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  guardianName?: string;
  classId: string;
  date: string; // "YYYY-MM-DD"
  timestamp: string; // ISO 8601
  status: AttendanceStatus;
  method: AttendanceMethod;
  remarks?: string;
  markedBy: string; // User ID
  markedByName: string;
  syncStatus?: 'local' | 'synced' | 'pending';
  sessionId?: string;
  auditedAt?: string;
  auditReason?: string;
  auditedBy?: string;
}

export type QRScanOutcome =
  | 'success'
  | 'already_present'
  | 'not_found'
  | 'class_mismatch'
  | 'conflict_leave'
  | 'disabled_credential'
  | 'revoked_credential'
  | 'finalized'
  | 'error';

export interface QRScanResult {
  outcome: QRScanOutcome;
  success: boolean;
  student?: Student;
  message: string;
  timestamp: string;
}

export type RegisterStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'finalized'
  | 'correction_required';

export interface DailyRegister {
  id: string; // `${classId}_${date}`
  classId: string;
  date: string; // "YYYY-MM-DD"
  status: RegisterStatus;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  sickCount: number;
  leaveCount: number;
  pendingCount: number;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  finalizedBy?: string;
  finalizedByName?: string;
  finalizedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'attendance' | 'register' | 'student' | 'class' | 'teacher' | 'school' | 'backup';
  entityId: string;
  details: string;
}

export interface BackupPayload {
  version: string;
  schemaVersion: number;
  exportedAt: string;
  schoolId: string;
  schoolName: string;
  recordCounts: {
    classes: number;
    teachers: number;
    students: number;
    attendance: number;
    registers: number;
    auditLogs: number;
  };
  data: {
    school: School | null;
    users: User[];
    teachers: Teacher[];
    classes: ClassGrade[];
    students: Student[];
    attendance: AttendanceRecord[];
    registers: DailyRegister[];
    auditLogs: AuditEvent[];
  };
}

export interface SchoolAnalytics {
  totalStudents: number;
  totalClasses: number;
  totalTeachers: number;
  todayOverallRate: number; // percentage
  todayPresentCount: number;
  todayAbsentCount: number;
  todaySickCount: number;
  todayLeaveCount: number;
  todayPendingCount: number;
  pendingRegistersCount: number;
  totalRegistersToday: number;
  finalizedRegistersToday: number;
  classSummaries: {
    classId: string;
    className: string;
    total: number;
    present: number;
    rate: number;
    status: RegisterStatus;
  }[];
  chronicAbsenceAlerts: {
    studentId: string;
    rollNumber: string;
    studentName: string;
    className: string;
    absenceCount: number;
    totalDays: number;
    attendanceRate: number;
  }[];
}
