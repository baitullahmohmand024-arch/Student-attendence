/**
 * SchoolSync Business Service Layer
 * Enforces business logic, duplicate checks, register audit workflows, and storage access.
 */

import { dbAdapter } from './db';
import {
  School,
  User,
  Teacher,
  ClassGrade,
  Student,
  AttendanceRecord,
  DailyRegister,
  AuditEvent,
  BackupPayload,
  SchoolAnalytics,
  AttendanceStatus,
  RegisterStatus,
  UserRole,
  QRScanResult
} from '../types';
import {
  SEED_SCHOOL,
  SEED_USERS,
  SEED_TEACHERS,
  SEED_CLASSES,
  buildSeedStudents,
  buildSeedAttendanceAndRegisters,
  getTodaySchoolDate
} from './seedData';

class SchoolService {
  private activeUser: User = SEED_USERS[0]; // Default to Principal

  // Active user / session management
  getActiveUser(): User {
    return this.activeUser;
  }

  setActiveUser(user: User) {
    this.activeUser = user;
  }

  // --- INITIALIZATION & RECOVERY ---
  async isInitialized(): Promise<boolean> {
    const schools = await dbAdapter.getAll<School>('schools');
    return schools.length > 0;
  }

  async initializeCleanApp(): Promise<School> {
    const schools = await dbAdapter.getAll<School>('schools');
    let school: School | null = schools[0] || null;

    // Purge fake demo seed data if previously seeded
    if (school && school.id === 'sch_oakwood_2026') {
      await dbAdapter.clear('students');
      await dbAdapter.clear('attendance');
      await dbAdapter.clear('classes');
      await dbAdapter.clear('schools');
      school = null;
    }

    if (!school) {
      const now = new Date().toISOString();
      school = {
        id: 'sch_default',
        name: 'SchoolSync Academy',
        principalName: 'Headmaster',
        country: 'General',
        timezone: 'Local',
        academicYear: '2026-2027',
        term: 'Term 1',
        workingDays: [1, 2, 3, 4, 5],
        createdAt: now,
        updatedAt: now,
        preferences: {
          cutOffTime: '08:30',
          requireLeaveReason: false,
          allowTeacherCorrectionBeforeFinalize: true,
          defaultStatus: 'pending',
          lateGraceMinutes: 15,
        },
      };
      await dbAdapter.put<School>('schools', school);
    }

    return school;
  }

  async initializeWithSeedData(): Promise<void> {
    await this.resetDatabase();

    await dbAdapter.put<School>('schools', SEED_SCHOOL);
    await dbAdapter.putMany<User>('users', SEED_USERS);
    await dbAdapter.putMany<Teacher>('teachers', SEED_TEACHERS);
    await dbAdapter.putMany<ClassGrade>('classes', SEED_CLASSES);

    const students = buildSeedStudents();
    await dbAdapter.putMany<Student>('students', students);

    const { attendance, registers, auditLogs } = buildSeedAttendanceAndRegisters(students);
    await dbAdapter.putMany<AttendanceRecord>('attendance', attendance);
    await dbAdapter.putMany<DailyRegister>('registers', registers);
    await dbAdapter.putMany<AuditEvent>('audit_logs', auditLogs);

    this.activeUser = SEED_USERS[0];
  }

  async initializeBlankSchool(schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): Promise<School> {
    await this.resetDatabase();

    const schoolId = `sch_${Date.now()}`;
    const now = new Date().toISOString();
    const school: School = {
      ...schoolData,
      id: schoolId,
      createdAt: now,
      updatedAt: now,
    };

    await dbAdapter.put<School>('schools', school);

    // Create default principal user
    const principalUser: User = {
      id: `usr_principal_${Date.now()}`,
      username: 'principal',
      fullName: school.principalName,
      role: 'principal',
      email: school.contactEmail || 'principal@school.edu',
      isActive: true,
      lastLogin: now,
    };
    await dbAdapter.put<User>('users', principalUser);
    this.activeUser = principalUser;

    await this.logAudit({
      action: 'SCHOOL_INITIALIZED',
      entityType: 'school',
      entityId: schoolId,
      details: `New school registered: ${school.name}. Configured for academic year ${school.academicYear}.`,
    });

    return school;
  }

  async resetDatabase(): Promise<void> {
    await dbAdapter.clear('schools');
    await dbAdapter.clear('users');
    await dbAdapter.clear('teachers');
    await dbAdapter.clear('classes');
    await dbAdapter.clear('students');
    await dbAdapter.clear('attendance');
    await dbAdapter.clear('registers');
    await dbAdapter.clear('audit_logs');
  }

  // --- AUDIT LOGGING ---
  async logAudit(params: {
    action: string;
    entityType: AuditEvent['entityType'];
    entityId: string;
    details: string;
    actor?: User;
  }): Promise<void> {
    const actor = params.actor || this.activeUser;
    const auditEvent: AuditEvent = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
    };
    await dbAdapter.put<AuditEvent>('audit_logs', auditEvent);
  }

  async getAuditLogs(): Promise<AuditEvent[]> {
    const logs = await dbAdapter.getAll<AuditEvent>('audit_logs');
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- SCHOOL PROFILE ---
  async getSchool(): Promise<School | null> {
    const schools = await dbAdapter.getAll<School>('schools');
    return schools.length > 0 ? schools[0] : null;
  }

  async updateSchool(updated: Partial<School>): Promise<School> {
    const current = await this.getSchool();
    if (!current) throw new Error('No active school found.');

    const merged: School = {
      ...current,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    await dbAdapter.put<School>('schools', merged);

    await this.logAudit({
      action: 'SCHOOL_PROFILE_UPDATED',
      entityType: 'school',
      entityId: merged.id,
      details: `School configuration updated: ${merged.name}. Timezone: ${merged.timezone}`,
    });

    return merged;
  }

  // --- USERS & ROLES ---
  async getUsers(): Promise<User[]> {
    return await dbAdapter.getAll<User>('users');
  }

  // --- CLASSES ---
  async getClasses(): Promise<ClassGrade[]> {
    const classes = await dbAdapter.getAll<ClassGrade>('classes');
    const students = await dbAdapter.getAll<Student>('students');

    // Attach dynamic student counts
    return classes.map((cls) => {
      const count = students.filter((s) => s.classId === cls.id && s.enrollmentStatus === 'active').length;
      return { ...cls, studentCount: count };
    });
  }

  async getClassById(classId: string): Promise<ClassGrade | null> {
    return await dbAdapter.get<ClassGrade>('classes', classId);
  }

  async createClass(data: {
    name: string;
    section?: string;
    headmasterName?: string;
    roomNumber?: string;
    academicYear?: string;
    assignedTeacherId?: string;
    capacity?: number;
  }): Promise<ClassGrade> {
    const school = await this.getSchool();
    const effectiveYear = data.academicYear || school?.academicYear || '2026-2027';
    const effectiveSection = data.section?.trim() || '';

    // Duplicate check: Same class name (+ section if specified) in same academic year
    const existing = await dbAdapter.getAll<ClassGrade>('classes');
    const duplicate = existing.find(
      (c) =>
        c.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
        (c.section || '').trim().toLowerCase() === effectiveSection.toLowerCase() &&
        c.academicYear === effectiveYear
    );
    if (duplicate) {
      throw new Error(`A class named "${data.name}${effectiveSection ? ' - ' + effectiveSection : ''}" already exists.`);
    }

    const newClass: ClassGrade = {
      id: `cls_${Date.now()}`,
      name: data.name.trim(),
      section: effectiveSection,
      headmasterName: data.headmasterName?.trim() || school?.principalName || 'Headmaster',
      roomNumber: data.roomNumber?.trim(),
      academicYear: effectiveYear,
      assignedTeacherId: data.assignedTeacherId || undefined,
      capacity: data.capacity || 50,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };

    await dbAdapter.put<ClassGrade>('classes', newClass);

    // If a teacher was assigned, update teacher's assignedClassIds
    if (newClass.assignedTeacherId) {
      const teacher = await dbAdapter.get<Teacher>('teachers', newClass.assignedTeacherId);
      if (teacher && !teacher.assignedClassIds.includes(newClass.id)) {
        teacher.assignedClassIds.push(newClass.id);
        await dbAdapter.put<Teacher>('teachers', teacher);
      }
    }

    await this.logAudit({
      action: 'CLASS_CREATED',
      entityType: 'class',
      entityId: newClass.id,
      details: `Class "${newClass.name} - ${newClass.section}" created.`,
    });

    return newClass;
  }

  async updateClass(classId: string, updates: Partial<ClassGrade>): Promise<ClassGrade> {
    const current = await dbAdapter.get<ClassGrade>('classes', classId);
    if (!current) throw new Error('Class not found.');

    const updated: ClassGrade = { ...current, ...updates };
    await dbAdapter.put<ClassGrade>('classes', updated);

    await this.logAudit({
      action: 'CLASS_UPDATED',
      entityType: 'class',
      entityId: classId,
      details: `Class "${updated.name} - ${updated.section}" updated.`,
    });

    return updated;
  }

  async deleteClass(classId: string): Promise<void> {
    const students = await this.getStudentsByClass(classId);
    if (students.length > 0) {
      throw new Error(`Cannot delete class because it still contains ${students.length} enrolled student(s). Reassign or transfer students first.`);
    }

    // Preserve historical attendance records
    const allAttendance = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const classAttendance = allAttendance.filter((a) => a.classId === classId);
    if (classAttendance.length > 0) {
      throw new Error(`Cannot delete class because it contains ${classAttendance.length} historical attendance record(s). Archiving is required to maintain school audit integrity.`);
    }

    const cls = await dbAdapter.get<ClassGrade>('classes', classId);
    await dbAdapter.delete('classes', classId);

    // Remove from teacher assignments
    const teachers = await dbAdapter.getAll<Teacher>('teachers');
    for (const t of teachers) {
      if (t.assignedClassIds.includes(classId)) {
        t.assignedClassIds = t.assignedClassIds.filter((id) => id !== classId);
        await dbAdapter.put<Teacher>('teachers', t);
      }
    }

    await this.logAudit({
      action: 'CLASS_DELETED',
      entityType: 'class',
      entityId: classId,
      details: `Class "${cls?.name || classId}" deleted.`,
    });
  }

  // --- TEACHERS ---
  async getTeachers(): Promise<Teacher[]> {
    return await dbAdapter.getAll<Teacher>('teachers');
  }

  async createTeacher(data: {
    employeeId: string;
    fullName: string;
    email: string;
    phone: string;
    assignedClassIds: string[];
    specialization?: string;
  }): Promise<Teacher> {
    const teachers = await dbAdapter.getAll<Teacher>('teachers');
    const existingEmp = teachers.find(
      (t) => t.employeeId.trim().toUpperCase() === data.employeeId.trim().toUpperCase()
    );
    if (existingEmp) {
      throw new Error(`A teacher with Employee ID "${data.employeeId}" already exists.`);
    }

    const teacherId = `tch_${Date.now()}`;
    const newTeacher: Teacher = {
      id: teacherId,
      employeeId: data.employeeId.trim().toUpperCase(),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      assignedClassIds: data.assignedClassIds,
      specialization: data.specialization?.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await dbAdapter.put<Teacher>('teachers', newTeacher);

    // Create user login account for this teacher
    const username = data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const newUser: User = {
      id: `usr_${teacherId}`,
      username,
      fullName: data.fullName.trim(),
      role: 'teacher',
      email: data.email.trim(),
      teacherProfileId: teacherId,
      isActive: true,
    };
    await dbAdapter.put<User>('users', newUser);

    await this.logAudit({
      action: 'TEACHER_REGISTERED',
      entityType: 'teacher',
      entityId: teacherId,
      details: `Teacher ${newTeacher.fullName} (${newTeacher.employeeId}) registered. Assigned classes: ${newTeacher.assignedClassIds.length}.`,
    });

    return newTeacher;
  }

  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    const current = await dbAdapter.get<Teacher>('teachers', teacherId);
    if (!current) throw new Error('Teacher record not found.');

    const updated: Teacher = { ...current, ...updates };
    await dbAdapter.put<Teacher>('teachers', updated);

    // Update associated user if name or email changed
    const users = await dbAdapter.getAll<User>('users');
    const user = users.find((u) => u.teacherProfileId === teacherId);
    if (user) {
      user.fullName = updated.fullName;
      user.email = updated.email;
      await dbAdapter.put<User>('users', user);
    }

    await this.logAudit({
      action: 'TEACHER_UPDATED',
      entityType: 'teacher',
      entityId: teacherId,
      details: `Teacher ${updated.fullName} updated.`,
    });

    return updated;
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    const teacher = await dbAdapter.get<Teacher>('teachers', teacherId);
    if (!teacher) return;

    await dbAdapter.delete('teachers', teacherId);

    // Delete corresponding user
    const users = await dbAdapter.getAll<User>('users');
    const user = users.find((u) => u.teacherProfileId === teacherId);
    if (user) {
      await dbAdapter.delete('users', user.id);
    }

    // Unassign classes
    const classes = await dbAdapter.getAll<ClassGrade>('classes');
    for (const c of classes) {
      if (c.assignedTeacherId === teacherId) {
        c.assignedTeacherId = undefined;
        await dbAdapter.put<ClassGrade>('classes', c);
      }
    }

    await this.logAudit({
      action: 'TEACHER_DELETED',
      entityType: 'teacher',
      entityId: teacherId,
      details: `Teacher ${teacher.fullName} removed.`,
    });
  }

  // --- STUDENTS ---
  async getStudents(classId?: string): Promise<Student[]> {
    const students = await dbAdapter.getAll<Student>('students');
    const filtered = classId ? students.filter((s) => s.classId === classId) : students;
    // Sort alphabetically by student full name as requested
    return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
  }

  async getStudentsByClass(classId: string): Promise<Student[]> {
    return this.getStudents(classId);
  }

  async getStudentById(studentId: string): Promise<Student | null> {
    return await dbAdapter.get<Student>('students', studentId);
  }

  async getStudentByQRToken(rawToken: string): Promise<Student | null> {
    const token = rawToken.trim();
    if (!token) return null;
    const students = await dbAdapter.getAll<Student>('students');

    // 1. Parse JSON credential payload if formatted as JSON
    if (token.startsWith('{') && token.endsWith('}')) {
      try {
        const parsed = JSON.parse(token);
        const targetId = parsed.sid || parsed.id || parsed.studentId;
        if (targetId) {
          const byParsedId = students.find((s) => s.id === targetId);
          if (byParsedId) return byParsedId;
        }
        if (parsed.cid) {
          // Check active credential ID or revoked credentials
          const byCred = students.find(
            (s) =>
              s.activeCredentialId === parsed.cid ||
              (Array.isArray(s.revokedCredentialIds) && s.revokedCredentialIds.includes(parsed.cid))
          );
          if (byCred) return byCred;
        }
        if (parsed.token) {
          const byParsedToken = students.find((s) => s.qrCodeToken.trim() === String(parsed.token).trim());
          if (byParsedToken) return byParsedToken;
        }
        if (parsed.roll && parsed.classId) {
          const byClassRoll = students.find(
            (s) => s.classId === parsed.classId && s.rollNumber === String(parsed.roll)
          );
          if (byClassRoll) return byClassRoll;
        }
      } catch {
        // Fall through to standard token lookups
      }
    }

    // 2. Direct match on qrCodeToken
    const byToken = students.find((s) => s.qrCodeToken.trim() === token);
    if (byToken) return byToken;

    // 3. Direct match on student internal ID
    const byId = students.find((s) => s.id === token);
    if (byId) return byId;

    // 4. Substring or prefix lookup for legacy test badges
    const bySub = students.find(
      (s) => s.qrCodeToken.includes(token) || token.includes(s.qrCodeToken) || token.includes(s.id)
    );
    if (bySub) return bySub;

    return null;
  }

  async createStudent(data: {
    rollNumber: string; // string e.g. "0001"
    fullName: string;
    gender: 'male' | 'female' | 'other';
    guardianName: string;
    guardianPhone: string;
    classId: string;
    admissionNumber?: string;
    admissionDate?: string;
    photoUrl?: string;
    dob?: string;
    bloodGroup?: string;
    address?: string;
    enrollmentStatus?: 'active' | 'inactive' | 'transferred';
  }): Promise<Student> {
    // 1. Format and sanitize roll number (must keep leading zeros)
    const cleanRoll = data.rollNumber.trim();
    if (!cleanRoll) {
      throw new Error('Roll number is required (leading zeros preserved, e.g. 0001).');
    }
    const cleanName = data.fullName.trim();
    if (!cleanName) {
      throw new Error('Student full name is required.');
    }
    if (!data.classId) {
      throw new Error('Please select an assigned class and section.');
    }

    // 2. Duplicate detection within the same class:
    const classStudents = await this.getStudentsByClass(data.classId);
    const dupRoll = classStudents.find((s) => s.rollNumber.toLowerCase() === cleanRoll.toLowerCase());
    if (dupRoll) {
      throw new Error(`Roll number "${cleanRoll}" is already assigned to ${dupRoll.fullName} in this class.`);
    }

    // 3. Admission number uniqueness check across school if provided
    if (data.admissionNumber?.trim()) {
      const allStudents = await dbAdapter.getAll<Student>('students');
      const dupAdm = allStudents.find(
        (s) => s.admissionNumber?.trim().toLowerCase() === data.admissionNumber?.trim().toLowerCase()
      );
      if (dupAdm) {
        throw new Error(`Admission number "${data.admissionNumber}" is already assigned to student ${dupAdm.fullName}.`);
      }
    }

    const school = await this.getSchool();
    const schoolId = school?.id || 'sch_main';
    const studentId = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const credentialId = `crd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Stable, versioned machine-readable credential payload
    const qrCodeToken = JSON.stringify({
      v: 1,
      sch: schoolId,
      sid: studentId,
      cid: credentialId,
    });
    const now = new Date().toISOString();

    const newStudent: Student = {
      id: studentId,
      rollNumber: cleanRoll,
      fullName: cleanName,
      gender: data.gender,
      guardianName: data.guardianName.trim() || 'Parent / Guardian',
      guardianPhone: data.guardianPhone.trim(),
      classId: data.classId,
      admissionNumber: data.admissionNumber?.trim(),
      admissionDate: data.admissionDate || now.split('T')[0],
      photoUrl: data.photoUrl,
      dob: data.dob,
      bloodGroup: data.bloodGroup,
      address: data.address?.trim(),
      enrollmentStatus: data.enrollmentStatus || 'active',
      qrCodeToken,
      activeCredentialId: credentialId,
      revokedCredentialIds: [],
      cardIssuedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await dbAdapter.put<Student>('students', newStudent);

    await this.logAudit({
      action: 'STUDENT_REGISTERED',
      entityType: 'student',
      entityId: newStudent.id,
      details: `Student ${newStudent.fullName} registered (Roll No: ${newStudent.rollNumber}). Credential ID: ${credentialId}.`,
    });

    return newStudent;
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    const current = await dbAdapter.get<Student>('students', studentId);
    if (!current) throw new Error('Student not found.');

    // If roll number or class is being changed, check duplicates in destination class
    const targetClassId = updates.classId || current.classId;
    const targetRoll = (updates.rollNumber !== undefined ? updates.rollNumber.trim() : current.rollNumber);

    if (updates.rollNumber !== undefined || updates.classId !== undefined) {
      const classStudents = await this.getStudentsByClass(targetClassId);
      const dup = classStudents.find(
        (s) => s.id !== studentId && s.rollNumber.toLowerCase() === targetRoll.toLowerCase()
      );
      if (dup) {
        throw new Error(`Roll number "${targetRoll}" already belongs to ${dup.fullName} in this class.`);
      }
    }

    // Preserve credential fields unless explicitly updating them
    const updated: Student = {
      ...current,
      ...updates,
      rollNumber: targetRoll,
      updatedAt: new Date().toISOString(),
    };

    await dbAdapter.put<Student>('students', updated);

    await this.logAudit({
      action: 'STUDENT_UPDATED',
      entityType: 'student',
      entityId: studentId,
      details: `Student ${updated.fullName} (Roll: ${updated.rollNumber}) updated.`,
    });

    return updated;
  }

  /**
   * Controlled student class/section transfer workflow.
   * CRITICAL: Preserves historical attendance records in the original class!
   */
  async transferStudent(params: {
    studentId: string;
    targetClassId: string;
    newRollNumber?: string;
    reason?: string;
  }): Promise<Student> {
    const student = await dbAdapter.get<Student>('students', params.studentId);
    if (!student) throw new Error('Student record not found.');

    const targetClass = await dbAdapter.get<ClassGrade>('classes', params.targetClassId);
    if (!targetClass) throw new Error('Target class not found.');

    const oldClass = await dbAdapter.get<ClassGrade>('classes', student.classId);

    const targetRoll = (params.newRollNumber !== undefined && params.newRollNumber.trim().length > 0)
      ? params.newRollNumber.trim()
      : student.rollNumber;

    // Check duplicate roll number in target class
    const targetStudents = await this.getStudentsByClass(params.targetClassId);
    const dup = targetStudents.find(
      (s) => s.id !== student.id && s.rollNumber.toLowerCase() === targetRoll.toLowerCase()
    );
    if (dup) {
      throw new Error(`Roll number "${targetRoll}" is already assigned to ${dup.fullName} in ${targetClass.name} - Section ${targetClass.section}.`);
    }

    const updatedStudent: Student = {
      ...student,
      classId: params.targetClassId,
      rollNumber: targetRoll,
      updatedAt: new Date().toISOString(),
    };

    await dbAdapter.put<Student>('students', updatedStudent);

    // Historical attendance records are preserved untouched!
    await this.logAudit({
      action: 'STUDENT_TRANSFERRED',
      entityType: 'student',
      entityId: student.id,
      details: `Student ${student.fullName} transferred from ${oldClass ? `${oldClass.name} - ${oldClass.section}` : student.classId} to ${targetClass.name} - ${targetClass.section} (Roll: ${targetRoll}). Justification: ${params.reason || 'Controlled class re-allocation'}. Historical attendance preserved.`,
    });

    return updatedStudent;
  }

  /**
   * Revoke lost/damaged card and generate a new secure QR credential.
   * Preserves all historical attendance records while blocking old cards from registering attendance.
   */
  async revokeAndReplaceCredential(studentId: string, reason: string): Promise<{ student: Student; newCredentialId: string }> {
    const student = await dbAdapter.get<Student>('students', studentId);
    if (!student) throw new Error('Student record not found.');

    const school = await this.getSchool();
    const schoolId = school?.id || 'sch_main';

    const oldCredentialId = student.activeCredentialId || student.qrCodeToken;
    const newCredentialId = `crd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Generate new versioned QR payload
    const newQrPayload = JSON.stringify({
      v: 1,
      sch: schoolId,
      sid: student.id,
      cid: newCredentialId,
    });

    const revokedList = Array.isArray(student.revokedCredentialIds) ? [...student.revokedCredentialIds] : [];
    if (oldCredentialId && !revokedList.includes(oldCredentialId)) {
      revokedList.push(oldCredentialId);
    }

    const now = new Date().toISOString();
    const updatedStudent: Student = {
      ...student,
      activeCredentialId: newCredentialId,
      revokedCredentialIds: revokedList,
      qrCodeToken: newQrPayload,
      cardIssuedAt: now,
      lastReplacedReason: reason.trim(),
      updatedAt: now,
    };

    await dbAdapter.put<Student>('students', updatedStudent);

    await this.logAudit({
      action: 'CREDENTIAL_REVOKED_REPLACED',
      entityType: 'student',
      entityId: student.id,
      details: `Revoked credential (${oldCredentialId}) for ${student.fullName} (Roll: ${student.rollNumber}). Issued replacement card with Credential ID ${newCredentialId}. Reason: ${reason}. Historical attendance preserved.`,
    });

    return { student: updatedStudent, newCredentialId };
  }

  /**
   * Record card re-printing in the school audit log.
   */
  async reprintCard(studentId: string): Promise<Student> {
    const student = await dbAdapter.get<Student>('students', studentId);
    if (!student) throw new Error('Student record not found.');

    const now = new Date().toISOString();
    const updatedStudent: Student = {
      ...student,
      cardIssuedAt: now,
      updatedAt: now,
    };

    await dbAdapter.put<Student>('students', updatedStudent);

    await this.logAudit({
      action: 'CARD_REPRINTED',
      entityType: 'student',
      entityId: student.id,
      details: `Re-printed student ID card for ${student.fullName} (Roll: ${student.rollNumber}, Credential: ${student.activeCredentialId || 'active'}).`,
    });

    return updatedStudent;
  }

  async deleteStudent(studentId: string): Promise<void> {
    const student = await dbAdapter.get<Student>('students', studentId);
    if (!student) return;

    // Check if student has attendance history
    const allAttendance = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const studentAttendance = allAttendance.filter((a) => a.studentId === studentId);
    if (studentAttendance.length > 0) {
      throw new Error(`Cannot delete student ${student.fullName} because they have ${studentAttendance.length} historical attendance record(s). Use Archive/Transfer status instead to preserve legal register history.`);
    }

    await dbAdapter.delete('students', studentId);

    await this.logAudit({
      action: 'STUDENT_DELETED',
      entityType: 'student',
      entityId: studentId,
      details: `Student ${student.fullName} (Roll: ${student.rollNumber}) permanently deleted.`,
    });
  }

  async bulkImportStudents(
    classId: string,
    records: {
      rollNumber: string;
      fullName: string;
      gender?: 'male' | 'female' | 'other';
      guardianName?: string;
      guardianPhone?: string;
      admissionNumber?: string;
      admissionDate?: string;
      dob?: string;
    }[]
  ): Promise<{ added: number; errors: string[]; importedStudents: Student[] }> {
    const errors: string[] = [];
    const importedStudents: Student[] = [];
    let added = 0;

    const school = await this.getSchool();
    const schoolId = school?.id || 'sch_main';

    const existingClassStudents = await this.getStudentsByClass(classId);
    const existingRolls = new Set(existingClassStudents.map((s) => s.rollNumber.toLowerCase()));

    const allStudents = await dbAdapter.getAll<Student>('students');
    const existingAdmissions = new Set(
      allStudents.filter((s) => s.admissionNumber).map((s) => s.admissionNumber!.toLowerCase())
    );

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const lineNum = i + 1;
      const roll = (r.rollNumber || '').trim();
      const name = (r.fullName || '').trim();

      if (!roll) {
        errors.push(`Row ${lineNum}: Missing roll number.`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${lineNum}: Missing student name.`);
        continue;
      }
      if (existingRolls.has(roll.toLowerCase())) {
        errors.push(`Row ${lineNum}: Roll number "${roll}" already exists in this class.`);
        continue;
      }
      if (r.admissionNumber && existingAdmissions.has(r.admissionNumber.trim().toLowerCase())) {
        errors.push(`Row ${lineNum}: Admission number "${r.admissionNumber}" is already in use by another student.`);
        continue;
      }

      const studentId = `stu_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`;
      const credentialId = `crd_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`;
      const qrCodeToken = JSON.stringify({
        v: 1,
        sch: schoolId,
        sid: studentId,
        cid: credentialId,
      });
      const now = new Date().toISOString();

      const newStudent: Student = {
        id: studentId,
        rollNumber: roll,
        fullName: name,
        gender: r.gender || 'male',
        guardianName: (r.guardianName || 'Parent / Guardian').trim(),
        guardianPhone: (r.guardianPhone || '').trim(),
        classId,
        admissionNumber: r.admissionNumber?.trim(),
        admissionDate: r.admissionDate || now.split('T')[0],
        dob: r.dob,
        enrollmentStatus: 'active',
        qrCodeToken,
        activeCredentialId: credentialId,
        revokedCredentialIds: [],
        cardIssuedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await dbAdapter.put<Student>('students', newStudent);
      existingRolls.add(roll.toLowerCase());
      if (newStudent.admissionNumber) {
        existingAdmissions.add(newStudent.admissionNumber.toLowerCase());
      }
      importedStudents.push(newStudent);
      added++;
    }

    if (added > 0) {
      await this.logAudit({
        action: 'STUDENTS_BULK_IMPORTED',
        entityType: 'student',
        entityId: classId,
        details: `Bulk imported ${added} students into class ${classId}. (${errors.length} failed rows)`,
      });
    }

    return { added, errors, importedStudents };
  }

  // --- ATTENDANCE & REGISTERS ---
  async getDailyRegister(classId: string, date: string): Promise<DailyRegister> {
    const registerId = `${classId}_${date}`;
    let register = await dbAdapter.get<DailyRegister>('registers', registerId);
    const students = await this.getStudentsByClass(classId);
    const activeStudents = students.filter((s) => s.enrollmentStatus === 'active');

    if (!register) {
      register = {
        id: registerId,
        classId,
        date,
        status: 'not_started',
        totalStudents: activeStudents.length,
        presentCount: 0,
        absentCount: 0,
        sickCount: 0,
        leaveCount: 0,
        pendingCount: activeStudents.length,
      };
      await dbAdapter.put<DailyRegister>('registers', register);
    }

    return register;
  }

  async getAttendanceForClassAndDate(classId: string, date: string): Promise<AttendanceRecord[]> {
    const allRecords = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const records = allRecords.filter((r) => r.classId === classId && r.date === date);

    // Get active students to verify complete roster representation
    const students = await this.getStudentsByClass(classId);
    const activeStudents = students.filter((s) => s.enrollmentStatus === 'active');

    const recordMap = new Map(records.map((r) => [r.studentId, r]));

    // Guarantee that every enrolled student has a traceable record state (defaults to 'pending' if not marked)
    const completeRoster: AttendanceRecord[] = [];
    const now = new Date().toISOString();

    for (const student of activeStudents) {
      if (recordMap.has(student.id)) {
        completeRoster.push(recordMap.get(student.id)!);
      } else {
        const pendingRecord: AttendanceRecord = {
          id: `${student.id}_${date}`,
          studentId: student.id,
          studentRollNumber: student.rollNumber,
          studentName: student.fullName,
          classId,
          date,
          timestamp: `${date}T08:00:00.000Z`,
          status: 'pending',
          method: 'system_default',
          markedBy: 'system',
          markedByName: 'System (Pending Review)',
        };
        await dbAdapter.put<AttendanceRecord>('attendance', pendingRecord);
        completeRoster.push(pendingRecord);
      }
    }

    return completeRoster.sort((a, b) =>
      a.studentRollNumber.localeCompare(b.studentRollNumber, undefined, { numeric: true })
    );
  }

  async markAttendance(params: {
    studentId: string;
    classId: string;
    date: string;
    status: AttendanceStatus;
    method?: 'qr_scan' | 'manual_entry' | 'system_default' | 'bulk_mark';
    remarks?: string;
  }): Promise<AttendanceRecord> {
    const register = await this.getDailyRegister(params.classId, params.date);

    // If register is finalized, ordinary marking is locked!
    if (register.status === 'finalized' && this.activeUser.role !== 'principal') {
      throw new Error('This register is finalized. Only the Principal can authorize attendance corrections with an audit reason.');
    }

    const student = await dbAdapter.get<Student>('students', params.studentId);
    if (!student) throw new Error('Student not found.');

    const recordId = `${params.studentId}_${params.date}`;
    const existing = await dbAdapter.get<AttendanceRecord>('attendance', recordId);

    const school = await this.getSchool();
    const cls = await this.getClassById(params.classId);

    const record: AttendanceRecord = {
      id: recordId,
      schoolId: school?.id,
      academicYear: school?.academicYear || cls?.academicYear,
      classSection: cls ? `${cls.name} - ${cls.section}` : undefined,
      studentId: student.id,
      studentRollNumber: student.rollNumber,
      studentName: student.fullName,
      guardianName: student.guardianName,
      classId: params.classId,
      date: params.date,
      timestamp: new Date().toISOString(),
      status: params.status,
      method: params.method || 'manual_entry',
      remarks: params.remarks ?? existing?.remarks,
      markedBy: this.activeUser.id,
      markedByName: this.activeUser.fullName,
      syncStatus: 'local',
    };

    await dbAdapter.put<AttendanceRecord>('attendance', record);
    await this.recalculateRegisterCounts(params.classId, params.date);

    return record;
  }

  async getAttendanceForStudent(studentId: string): Promise<AttendanceRecord[]> {
    const all = await dbAdapter.getAll<AttendanceRecord>('attendance');
    return all
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
    const all = await dbAdapter.getAll<AttendanceRecord>('attendance');
    return all.filter((r) => r.date === date);
  }

  async markAttendanceFastQR(qrToken: string, date: string): Promise<QRScanResult> {
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const student = await this.getStudentByQRToken(qrToken);

    if (!student) {
      return {
        outcome: 'not_found',
        success: false,
        message: 'Unknown student QR code. No matching record in local database.',
        timestamp: timestampStr,
      };
    }

    const attendanceId = `${student.id}_${date}`;
    const existing = await dbAdapter.get<AttendanceRecord>('attendance', attendanceId);

    if (existing && existing.status === 'present') {
      return {
        outcome: 'already_present',
        success: true,
        student,
        message: `${student.fullName} (Roll: ${student.rollNumber}) is already marked Present today.`,
        timestamp: timestampStr,
      };
    }

    const targetClass = await this.getClassById(student.classId);
    const classNameStr = targetClass ? targetClass.name : `Class ${student.classId}`;

    const newRecord: AttendanceRecord = {
      id: attendanceId,
      studentId: student.id,
      studentRollNumber: student.rollNumber,
      studentName: student.fullName,
      guardianName: student.guardianName,
      classId: student.classId,
      classSection: classNameStr,
      date,
      timestamp: new Date().toISOString(),
      status: 'present',
      method: 'qr_scan',
      markedBy: this.activeUser?.id || 'teacher',
      markedByName: this.activeUser?.fullName || 'Teacher',
    };

    await dbAdapter.put<AttendanceRecord>('attendance', newRecord);

    return {
      outcome: 'success',
      success: true,
      student,
      message: `${student.fullName} (Roll: ${student.rollNumber}) marked Present.`,
      timestamp: timestampStr,
    };
  }

  async markAttendanceViaQRScan(qrToken: string, classId: string, date: string): Promise<QRScanResult> {
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Session status check: Finalized registers cannot accept ordinary scans
    const register = await this.getDailyRegister(classId, date);
    if (register.status === 'finalized') {
      return {
        outcome: 'finalized',
        success: false,
        message: 'This register is finalized. New scans cannot be accepted unless reopened by the Principal.',
        timestamp: timestampStr,
      };
    }

    // 2. Resolve student by internal token or identifier
    const student = await this.getStudentByQRToken(qrToken);
    if (!student) {
      return {
        outcome: 'not_found',
        success: false,
        message: 'Student not found. Unrecognized QR credential.',
        timestamp: timestampStr,
      };
    }

    // 2b. Revoked Credential Check (Section 5: Support active and revoked credentials)
    let scannedCid: string | null = null;
    if (qrToken.trim().startsWith('{') && qrToken.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(qrToken.trim());
        if (parsed.cid) scannedCid = parsed.cid;
      } catch {
        // ignore
      }
    }

    if (
      scannedCid &&
      Array.isArray(student.revokedCredentialIds) &&
      student.revokedCredentialIds.includes(scannedCid)
    ) {
      return {
        outcome: 'revoked_credential',
        success: false,
        student,
        message: 'Card Revoked: This ID card was reported lost or damaged and has been revoked. Please use the newly issued replacement card.',
        timestamp: timestampStr,
      };
    }

    // 3. Class and Section check
    if (student.classId !== classId) {
      const targetClass = await this.getClassById(student.classId);
      const activeClass = await this.getClassById(classId);
      const targetName = targetClass ? `${targetClass.name} - ${targetClass.section}` : 'another class';
      const activeName = activeClass ? `${activeClass.name} - ${activeClass.section}` : 'this class';
      return {
        outcome: 'class_mismatch',
        success: false,
        student,
        message: `Class Mismatch: Student is enrolled in ${targetName}, not ${activeName}.`,
        timestamp: timestampStr,
      };
    }

    // 4. Enrollment status check
    if (student.enrollmentStatus !== 'active') {
      return {
        outcome: 'disabled_credential',
        success: false,
        student,
        message: `Credential disabled: Student status is "${student.enrollmentStatus}".`,
        timestamp: timestampStr,
      };
    }

    // 5. Existing attendance check for today
    const recordId = `${student.id}_${date}`;
    const existing = await dbAdapter.get<AttendanceRecord>('attendance', recordId);

    // If already marked Present
    if (existing && existing.status === 'present') {
      const formattedTime = new Date(existing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        outcome: 'already_present',
        success: true,
        student,
        message: `Already marked Present at ${formattedTime}.`,
        timestamp: timestampStr,
      };
    }

    // If already recorded on Approved Leave or Sick Leave
    if (existing && (existing.status === 'approved_leave' || existing.status === 'sick_leave')) {
      const leaveType = existing.status === 'sick_leave' ? 'Sick Leave' : 'Approved Leave';
      return {
        outcome: 'conflict_leave',
        success: false,
        student,
        message: `Conflict: Student is already registered on ${leaveType}. Resolving requires manual review.`,
        timestamp: timestampStr,
      };
    }

    // 6. Record attendance atomically in local IndexedDB
    try {
      await this.markAttendance({
        studentId: student.id,
        classId,
        date,
        status: 'present',
        method: 'qr_scan',
        remarks: 'Scanned via Student ID Pass',
      });

      return {
        outcome: 'success',
        success: true,
        student,
        message: 'Saved successfully.',
        timestamp: timestampStr,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database write error';
      return {
        outcome: 'error',
        success: false,
        student,
        message: `Database error: ${message}`,
        timestamp: timestampStr,
      };
    }
  }

  async bulkMarkAttendance(
    classId: string,
    date: string,
    status: AttendanceStatus,
    targetFilter?: 'all' | 'pending_only'
  ): Promise<void> {
    const register = await this.getDailyRegister(classId, date);
    if (register.status === 'finalized' && this.activeUser.role !== 'principal') {
      throw new Error('Register is finalized. Edits are restricted to Principal.');
    }

    const currentRecords = await this.getAttendanceForClassAndDate(classId, date);
    const now = new Date().toISOString();

    for (const rec of currentRecords) {
      if (targetFilter === 'pending_only' && rec.status !== 'pending') {
        continue;
      }

      rec.status = status;
      rec.method = 'bulk_mark';
      rec.markedBy = this.activeUser.id;
      rec.markedByName = this.activeUser.fullName;
      rec.timestamp = now;
      await dbAdapter.put<AttendanceRecord>('attendance', rec);
    }

    await this.recalculateRegisterCounts(classId, date);

    await this.logAudit({
      action: 'ATTENDANCE_BULK_MARKED',
      entityType: 'register',
      entityId: `${classId}_${date}`,
      details: `Bulk marked ${status} for class ${classId} on ${date}.`,
    });
  }

  async correctAttendanceWithAudit(params: {
    recordId: string;
    newStatus: AttendanceStatus;
    auditReason: string;
    remarks?: string;
  }): Promise<AttendanceRecord> {
    if (!params.auditReason.trim()) {
      throw new Error('An audit reason is strictly required to authorize an attendance correction.');
    }

    const current = await dbAdapter.get<AttendanceRecord>('attendance', params.recordId);
    if (!current) throw new Error('Attendance record not found.');

    const oldStatus = current.status;
    const now = new Date().toISOString();

    const updated: AttendanceRecord = {
      ...current,
      status: params.newStatus,
      remarks: params.remarks !== undefined ? params.remarks : current.remarks,
      auditedAt: now,
      auditReason: params.auditReason.trim(),
      auditedBy: this.activeUser.fullName,
    };

    await dbAdapter.put<AttendanceRecord>('attendance', updated);
    await this.recalculateRegisterCounts(current.classId, current.date);

    await this.logAudit({
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'attendance',
      entityId: params.recordId,
      details: `Corrected status for ${current.studentName} from ${oldStatus} to ${params.newStatus}. Reason: "${params.auditReason.trim()}"`,
    });

    return updated;
  }

  async recalculateRegisterCounts(classId: string, date: string): Promise<DailyRegister> {
    const registerId = `${classId}_${date}`;
    const register = await this.getDailyRegister(classId, date);

    const allRecords = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const records = allRecords.filter((r) => r.classId === classId && r.date === date);

    let present = 0;
    let absent = 0;
    let sick = 0;
    let leave = 0;
    let pending = 0;

    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'sick_leave') sick++;
      else if (r.status === 'approved_leave') leave++;
      else pending++;
    }

    let status = register.status;
    if (status === 'not_started' && (present > 0 || absent > 0 || sick > 0 || leave > 0)) {
      status = 'in_progress';
    }

    const updatedRegister: DailyRegister = {
      ...register,
      totalStudents: records.length,
      presentCount: present,
      absentCount: absent,
      sickCount: sick,
      leaveCount: leave,
      pendingCount: pending,
      status,
    };

    await dbAdapter.put<DailyRegister>('registers', updatedRegister);
    return updatedRegister;
  }

  // --- REGISTER SUBMISSION & AUDITED FINALIZATION ---
  async submitRegister(classId: string, date: string, notes?: string): Promise<DailyRegister> {
    const register = await this.getDailyRegister(classId, date);

    if (register.pendingCount > 0) {
      throw new Error(
        `Cannot submit register: ${register.pendingCount} student(s) remain in "Pending" status. Review each student as Present, Absent, Sick, or Approved Leave first.`
      );
    }

    const updated: DailyRegister = {
      ...register,
      status: 'submitted',
      submittedBy: this.activeUser.id,
      submittedByName: this.activeUser.fullName,
      submittedAt: new Date().toISOString(),
      notes: notes || register.notes,
    };

    await dbAdapter.put<DailyRegister>('registers', updated);

    await this.logAudit({
      action: 'REGISTER_SUBMITTED',
      entityType: 'register',
      entityId: register.id,
      details: `Daily register submitted by ${this.activeUser.fullName} for Principal review. Total: ${register.totalStudents}, Present: ${register.presentCount}.`,
    });

    return updated;
  }

  async finalizeRegister(classId: string, date: string): Promise<DailyRegister> {
    if (this.activeUser.role !== 'principal') {
      throw new Error('Only the Principal is authorized to finalize daily attendance registers.');
    }

    const register = await this.getDailyRegister(classId, date);
    if (register.pendingCount > 0) {
      throw new Error(`Cannot finalize: ${register.pendingCount} student(s) still pending review.`);
    }

    const updated: DailyRegister = {
      ...register,
      status: 'finalized',
      finalizedBy: this.activeUser.id,
      finalizedByName: this.activeUser.fullName,
      finalizedAt: new Date().toISOString(),
    };

    await dbAdapter.put<DailyRegister>('registers', updated);

    await this.logAudit({
      action: 'REGISTER_FINALIZED',
      entityType: 'register',
      entityId: register.id,
      details: `Register finalized and locked by Principal ${this.activeUser.fullName}.`,
    });

    return updated;
  }

  async reopenRegister(classId: string, date: string, reason: string): Promise<DailyRegister> {
    if (this.activeUser.role !== 'principal') {
      throw new Error('Only the Principal is authorized to reopen a finalized register.');
    }
    if (!reason.trim()) {
      throw new Error('An audit reason is required to reopen a finalized register.');
    }

    const register = await this.getDailyRegister(classId, date);
    const updated: DailyRegister = {
      ...register,
      status: 'correction_required',
      reopenedBy: this.activeUser.id,
      reopenedAt: new Date().toISOString(),
      reopenReason: reason.trim(),
    };

    await dbAdapter.put<DailyRegister>('registers', updated);

    await this.logAudit({
      action: 'REGISTER_REOPENED',
      entityType: 'register',
      entityId: register.id,
      details: `Finalized register reopened by Principal ${this.activeUser.fullName}. Reason: "${reason.trim()}"`,
    });

    return updated;
  }

  // --- ANALYTICS ---
  async getSchoolAnalytics(date: string = getTodaySchoolDate()): Promise<SchoolAnalytics> {
    const classes = await this.getClasses();
    const students = await dbAdapter.getAll<Student>('students');
    const activeStudents = students.filter((s) => s.enrollmentStatus === 'active');
    const teachers = await dbAdapter.getAll<Teacher>('teachers');
    const allAttendance = await dbAdapter.getAll<AttendanceRecord>('attendance');

    const todayAttendance = allAttendance.filter((r) => r.date === date);

    let todayPresent = 0;
    let todayAbsent = 0;
    let todaySick = 0;
    let todayLeave = 0;
    let todayPending = 0;

    for (const r of todayAttendance) {
      if (r.status === 'present') todayPresent++;
      else if (r.status === 'absent') todayAbsent++;
      else if (r.status === 'sick_leave') todaySick++;
      else if (r.status === 'approved_leave') todayLeave++;
      else todayPending++;
    }

    // Active students not yet in todayAttendance are also pending
    const markedStudentIds = new Set(todayAttendance.map((r) => r.studentId));
    const unrecordedActiveCount = activeStudents.filter((s) => !markedStudentIds.has(s.id)).length;
    todayPending += unrecordedActiveCount;

    const totalMarkedDecisive = todayPresent + todayAbsent + todaySick + todayLeave;
    const overallRate = totalMarkedDecisive > 0
      ? Math.round((todayPresent / totalMarkedDecisive) * 100)
      : 0;

    // Class summaries
    const classSummaries = await Promise.all(
      classes.map(async (c) => {
        const reg = await this.getDailyRegister(c.id, date);
        const cStudents = activeStudents.filter((s) => s.classId === c.id);
        const cRecords = todayAttendance.filter((r) => r.classId === c.id);
        const cPresent = cRecords.filter((r) => r.status === 'present').length;
        const cDecisive = cRecords.filter((r) => ['present', 'absent', 'sick_leave', 'approved_leave'].includes(r.status)).length;
        const rate = cDecisive > 0 ? Math.round((cPresent / cDecisive) * 100) : 0;

        return {
          classId: c.id,
          className: `${c.name} - ${c.section}`,
          total: cStudents.length,
          present: cPresent,
          rate,
          status: reg.status,
        };
      })
    );

    const pendingRegistersCount = classSummaries.filter((c) => c.status !== 'finalized').length;
    const finalizedRegistersToday = classSummaries.filter((c) => c.status === 'finalized').length;

    // Chronic absence alerts (students with >2 absences across history or rate < 75%)
    const studentAbsenceMap = new Map<string, { absent: number; total: number }>();
    allAttendance.forEach((r) => {
      if (!studentAbsenceMap.has(r.studentId)) {
        studentAbsenceMap.set(r.studentId, { absent: 0, total: 0 });
      }
      const data = studentAbsenceMap.get(r.studentId)!;
      data.total++;
      if (r.status === 'absent' || r.status === 'sick_leave') {
        data.absent++;
      }
    });

    const chronicAbsenceAlerts: SchoolAnalytics['chronicAbsenceAlerts'] = [];
    activeStudents.forEach((st) => {
      const stats = studentAbsenceMap.get(st.id);
      if (stats && stats.total >= 3) {
        const rate = Math.round(((stats.total - stats.absent) / stats.total) * 100);
        if (rate < 85 || stats.absent >= 2) {
          const cls = classes.find((c) => c.id === st.classId);
          chronicAbsenceAlerts.push({
            studentId: st.id,
            rollNumber: st.rollNumber,
            studentName: st.fullName,
            className: cls ? `${cls.name} - ${cls.section}` : 'N/A',
            absenceCount: stats.absent,
            totalDays: stats.total,
            attendanceRate: rate,
          });
        }
      }
    });

    return {
      totalStudents: activeStudents.length,
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      todayOverallRate: overallRate,
      todayPresentCount: todayPresent,
      todayAbsentCount: todayAbsent,
      todaySickCount: todaySick,
      todayLeaveCount: todayLeave,
      todayPendingCount: todayPending,
      pendingRegistersCount,
      totalRegistersToday: classes.length,
      finalizedRegistersToday,
      classSummaries,
      chronicAbsenceAlerts: chronicAbsenceAlerts.sort((a, b) => a.attendanceRate - b.attendanceRate),
    };
  }

  // --- MONTHLY MATRIX ---
  async getMonthlyAttendanceMatrix(classId?: string, year = new Date().getFullYear(), month = new Date().getMonth() + 1): Promise<{
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
  }> {
    const school = await this.getSchool();
    const workingDays = school?.workingDays || [1, 2, 3, 4, 5];
    const isAll = !classId || classId === 'all';
    const students = isAll ? await this.getStudents() : await this.getStudentsByClass(classId);
    const activeStudents = students.filter((s) => s.enrollmentStatus === 'active');

    // Days in specified month
    const totalDays = new Date(year, month, 0).getDate();
    const daysInMonth: number[] = Array.from({ length: totalDays }, (_, i) => i + 1);
    const dates: string[] = daysInMonth.map(
      (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );

    const allAttendance = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const classAttendance = isAll ? allAttendance : allAttendance.filter((r) => r.classId === classId);

    const studentMatrix = activeStudents.map((student) => {
      const recordsByDate = new Map<string, AttendanceRecord>();
      classAttendance
        .filter((r) => r.studentId === student.id)
        .forEach((r) => recordsByDate.set(r.date, r));

      const days: Record<number, AttendanceStatus | 'weekend' | 'unrecorded'> = {};
      let presentCount = 0;
      let absentCount = 0;
      let sickCount = 0;
      let leaveCount = 0;
      let decisiveCount = 0;

      daysInMonth.forEach((dayNum) => {
        const dateStr = dates[dayNum - 1];
        const dateObj = new Date(year, month - 1, dayNum);
        const dayOfWeek = dateObj.getDay();

        if (!workingDays.includes(dayOfWeek)) {
          days[dayNum] = 'weekend';
          return;
        }

        const rec = recordsByDate.get(dateStr);
        if (!rec) {
          days[dayNum] = 'unrecorded';
        } else {
          days[dayNum] = rec.status;
          if (rec.status === 'present') {
            presentCount++;
            decisiveCount++;
          } else if (rec.status === 'absent') {
            absentCount++;
            decisiveCount++;
          } else if (rec.status === 'sick_leave') {
            sickCount++;
            decisiveCount++;
          } else if (rec.status === 'approved_leave') {
            leaveCount++;
            decisiveCount++;
          }
        }
      });

      const rate = decisiveCount > 0 ? Math.round((presentCount / decisiveCount) * 100) : 0;

      return {
        student,
        days,
        presentCount,
        absentCount,
        sickCount,
        leaveCount,
        rate,
      };
    });

    return {
      daysInMonth,
      students: studentMatrix,
      dates,
    };
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<string> {
    const school = await this.getSchool();
    const users = await dbAdapter.getAll<User>('users');
    const teachers = await dbAdapter.getAll<Teacher>('teachers');
    const classes = await dbAdapter.getAll<ClassGrade>('classes');
    const students = await dbAdapter.getAll<Student>('students');
    const attendance = await dbAdapter.getAll<AttendanceRecord>('attendance');
    const registers = await dbAdapter.getAll<DailyRegister>('registers');
    const auditLogs = await dbAdapter.getAll<AuditEvent>('audit_logs');

    const payload: BackupPayload = {
      version: '1.0.0',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      schoolId: school?.id || 'uninitialized',
      schoolName: school?.name || 'SchoolSync Database',
      recordCounts: {
        classes: classes.length,
        teachers: teachers.length,
        students: students.length,
        attendance: attendance.length,
        registers: registers.length,
        auditLogs: auditLogs.length,
      },
      data: {
        school,
        users,
        teachers,
        classes,
        students,
        attendance,
        registers,
        auditLogs,
      },
    };

    await this.logAudit({
      action: 'BACKUP_EXPORTED',
      entityType: 'backup',
      entityId: payload.schoolId,
      details: `Full JSON backup generated with ${students.length} students and ${attendance.length} attendance records.`,
    });

    return JSON.stringify(payload, null, 2);
  }

  async validateAndImportBackup(jsonString: string): Promise<{ success: boolean; message: string; summary?: BackupPayload['recordCounts'] }> {
    let parsed: BackupPayload;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { success: false, message: 'Invalid JSON file: parsing failed.' };
    }

    if (!parsed.version || !parsed.data || typeof parsed.data !== 'object') {
      return { success: false, message: 'Validation error: The uploaded file does not adhere to SchoolSync backup specification.' };
    }

    const { school, users, teachers, classes, students, attendance, registers, auditLogs } = parsed.data;

    if (!classes || !Array.isArray(classes) || !students || !Array.isArray(students)) {
      return { success: false, message: 'Validation error: Missing classes or students array.' };
    }

    // Apply restore
    await this.resetDatabase();

    if (school) {
      await dbAdapter.put<School>('schools', school);
    }
    if (users && users.length) await dbAdapter.putMany<User>('users', users);
    if (teachers && teachers.length) await dbAdapter.putMany<Teacher>('teachers', teachers);
    if (classes && classes.length) await dbAdapter.putMany<ClassGrade>('classes', classes);
    if (students && students.length) await dbAdapter.putMany<Student>('students', students);
    if (attendance && attendance.length) await dbAdapter.putMany<AttendanceRecord>('attendance', attendance);
    if (registers && registers.length) await dbAdapter.putMany<DailyRegister>('registers', registers);
    if (auditLogs && auditLogs.length) await dbAdapter.putMany<AuditEvent>('audit_logs', auditLogs);

    await this.logAudit({
      action: 'BACKUP_RESTORED',
      entityType: 'backup',
      entityId: school?.id || 'restored_db',
      details: `Database successfully restored from backup export dated ${parsed.exportedAt}. Restored ${students.length} students across ${classes.length} classes.`,
    });

    return {
      success: true,
      message: `Database successfully restored from ${parsed.schoolName || 'backup'}.`,
      summary: parsed.recordCounts || {
        classes: classes.length,
        teachers: teachers?.length || 0,
        students: students.length,
        attendance: attendance?.length || 0,
        registers: registers?.length || 0,
        auditLogs: auditLogs?.length || 0,
      },
    };
  }
}

export const schoolService = new SchoolService();
