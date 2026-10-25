/**
 * Realistic Initial Sample Data for SchoolSync
 * Provides realistic demo school, teachers, classes, students, and attendance records
 */

import {
  School,
  User,
  Teacher,
  ClassGrade,
  Student,
  AttendanceRecord,
  DailyRegister,
  AuditEvent
} from '../types';

export function getTodaySchoolDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPastDates(daysBack: number): string[] {
  const dates: string[] = [];
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // skip Sundays (0) if desired
    if (d.getDay() !== 0) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
}

export const SEED_SCHOOL: School = {
  id: 'sch_oakwood_2026',
  name: 'Oakwood International Academy',
  code: 'OIA-904',
  country: 'United Kingdom',
  timezone: 'Europe/London',
  academicYear: '2026-2027',
  term: 'Term 1',
  workingDays: [1, 2, 3, 4, 5], // Mon to Fri
  principalName: 'Dr. Arthur Sterling',
  contactEmail: 'principal@oakwood-academy.edu',
  contactPhone: '+44 20 7946 0912',
  address: '14 Elmwood Crescent, Cambridge, CB2 1TJ',
  preferences: {
    cutOffTime: '08:45',
    requireLeaveReason: true,
    allowTeacherCorrectionBeforeFinalize: true,
    defaultStatus: 'pending',
    lateGraceMinutes: 15,
  },
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
};

export const SEED_USERS: User[] = [
  {
    id: 'usr_principal_01',
    username: 'principal',
    fullName: 'Dr. Arthur Sterling',
    role: 'principal',
    email: 'principal@oakwood-academy.edu',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'usr_teacher_01',
    username: 'elena.rostova',
    fullName: 'Ms. Elena Rostova',
    role: 'teacher',
    email: 'elena.rostova@oakwood-academy.edu',
    teacherProfileId: 'tch_001',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'usr_teacher_02',
    username: 'marcus.chen',
    fullName: 'Mr. Marcus Chen',
    role: 'teacher',
    email: 'marcus.chen@oakwood-academy.edu',
    teacherProfileId: 'tch_002',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'usr_teacher_03',
    username: 'fatima.zahra',
    fullName: 'Ms. Fatima Zahra',
    role: 'teacher',
    email: 'fatima.zahra@oakwood-academy.edu',
    teacherProfileId: 'tch_003',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
];

export const SEED_TEACHERS: Teacher[] = [
  {
    id: 'tch_001',
    employeeId: 'TCH-101',
    fullName: 'Ms. Elena Rostova',
    email: 'elena.rostova@oakwood-academy.edu',
    phone: '+44 7700 900142',
    assignedClassIds: ['cls_10a'],
    specialization: 'Mathematics & STEM',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'tch_002',
    employeeId: 'TCH-102',
    fullName: 'Mr. Marcus Chen',
    email: 'marcus.chen@oakwood-academy.edu',
    phone: '+44 7700 900288',
    assignedClassIds: ['cls_9a'],
    specialization: 'Science & Physics',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'tch_003',
    employeeId: 'TCH-103',
    fullName: 'Ms. Fatima Zahra',
    email: 'fatima.zahra@oakwood-academy.edu',
    phone: '+44 7700 900351',
    assignedClassIds: ['cls_10b', 'cls_9b'],
    specialization: 'Languages & Literature',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export const SEED_CLASSES: ClassGrade[] = [
  {
    id: 'cls_10a',
    name: 'Grade 10',
    section: 'A',
    roomNumber: 'Room 204',
    academicYear: '2026-2027',
    assignedTeacherId: 'tch_001',
    studentCount: 15,
    capacity: 30,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'cls_10b',
    name: 'Grade 10',
    section: 'B',
    roomNumber: 'Room 205',
    academicYear: '2026-2027',
    assignedTeacherId: 'tch_003',
    studentCount: 12,
    capacity: 30,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'cls_9a',
    name: 'Grade 9',
    section: 'A',
    roomNumber: 'Room 108',
    academicYear: '2026-2027',
    assignedTeacherId: 'tch_002',
    studentCount: 14,
    capacity: 30,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'cls_9b',
    name: 'Grade 9',
    section: 'B',
    roomNumber: 'Room 109',
    academicYear: '2026-2027',
    assignedTeacherId: 'tch_003',
    studentCount: 10,
    capacity: 30,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

const RAW_STUDENT_NAMES_10A = [
  { name: 'Aiden Liam Brooks', gender: 'male' as const, guardian: 'Robert Brooks', phone: '+44 7911 112001' },
  { name: 'Amara Sophia Okafor', gender: 'female' as const, guardian: 'Chidi Okafor', phone: '+44 7911 112002' },
  { name: 'Benjamin Tyler Hayes', gender: 'male' as const, guardian: 'Claire Hayes', phone: '+44 7911 112003' },
  { name: 'Chloe Renee Dubois', gender: 'female' as const, guardian: 'Jean Dubois', phone: '+44 7911 112004' },
  { name: 'Daniel Kaelen Murphy', gender: 'male' as const, guardian: 'Patrick Murphy', phone: '+44 7911 112005' },
  { name: 'Eleanor Jane Watson', gender: 'female' as const, guardian: 'Dr. Sarah Watson', phone: '+44 7911 112006' },
  { name: 'Gabriel Isaac Vance', gender: 'male' as const, guardian: 'David Vance', phone: '+44 7911 112007' },
  { name: 'Hana Maria Tanaka', gender: 'female' as const, guardian: 'Kenji Tanaka', phone: '+44 7911 112008' },
  { name: 'Ibrahim Tariq Al-Sayed', gender: 'male' as const, guardian: 'Tariq Al-Sayed', phone: '+44 7911 112009' },
  { name: 'Isabella Rose Thornton', gender: 'female' as const, guardian: 'Victoria Thornton', phone: '+44 7911 112010' },
  { name: 'Jacob Samuel Miller', gender: 'male' as const, guardian: 'Andrew Miller', phone: '+44 7911 112011' },
  { name: 'Kavya Priya Sharma', gender: 'female' as const, guardian: 'Rajesh Sharma', phone: '+44 7911 112012' },
  { name: 'Lucas Gabriel Silva', gender: 'male' as const, guardian: 'Marcos Silva', phone: '+44 7911 112013' },
  { name: 'Mia Caroline Campbell', gender: 'female' as const, guardian: 'Fiona Campbell', phone: '+44 7911 112014' },
  { name: 'Noah Alexander Patel', gender: 'male' as const, guardian: 'Sanjay Patel', phone: '+44 7911 112015' },
];

const RAW_STUDENT_NAMES_9A = [
  { name: 'Aaron Michael Ross', gender: 'male' as const, guardian: 'Paul Ross', phone: '+44 7911 221001' },
  { name: 'Beatrice Alice Wright', gender: 'female' as const, guardian: 'Helena Wright', phone: '+44 7911 221002' },
  { name: 'Connor James Davies', gender: 'male' as const, guardian: 'Gareth Davies', phone: '+44 7911 221003' },
  { name: 'Daphne Grace Cooper', gender: 'female' as const, guardian: 'Rachel Cooper', phone: '+44 7911 221004' },
  { name: 'Ethan Luke Morales', gender: 'male' as const, guardian: 'Carlos Morales', phone: '+44 7911 221005' },
  { name: 'Freya Christine Scott', gender: 'female' as const, guardian: 'Anne Scott', phone: '+44 7911 221006' },
  { name: 'George Henry Bennett', gender: 'male' as const, guardian: 'Ian Bennett', phone: '+44 7911 221007' },
  { name: 'Hannah Louise Kelly', gender: 'female' as const, guardian: 'Brian Kelly', phone: '+44 7911 221008' },
  { name: 'Julian Oliver Ward', gender: 'male' as const, guardian: 'Thomas Ward', phone: '+44 7911 221009' },
  { name: 'Leila Noor Haddad', gender: 'female' as const, guardian: 'Ziad Haddad', phone: '+44 7911 221010' },
  { name: 'Maxwell Dean Turner', gender: 'male' as const, guardian: 'Neil Turner', phone: '+44 7911 221011' },
  { name: 'Nadia Michelle Gomez', gender: 'female' as const, guardian: 'Elena Gomez', phone: '+44 7911 221012' },
  { name: 'Oscar William Evans', gender: 'male' as const, guardian: 'Christopher Evans', phone: '+44 7911 221013' },
  { name: 'Penelope Jane Fox', gender: 'female' as const, guardian: 'Katherine Fox', phone: '+44 7911 221014' },
];

const RAW_STUDENT_NAMES_10B = [
  { name: 'Arthur James Pendelton', gender: 'male' as const, guardian: 'Lord Pendelton', phone: '+44 7911 331001' },
  { name: 'Bianca Maria Rossi', gender: 'female' as const, guardian: 'Matteo Rossi', phone: '+44 7911 331002' },
  { name: 'Callum Liam Hughes', gender: 'male' as const, guardian: 'Owen Hughes', phone: '+44 7911 331003' },
  { name: 'Diana Ruth Jenkins', gender: 'female' as const, guardian: 'Mary Jenkins', phone: '+44 7911 331004' },
  { name: 'Felix Otto Weber', gender: 'male' as const, guardian: 'Klaus Weber', phone: '+44 7911 331005' },
  { name: 'Gemma Sian Morgan', gender: 'female' as const, guardian: 'Dylan Morgan', phone: '+44 7911 331006' },
  { name: 'Harrison Blake Cole', gender: 'male' as const, guardian: 'Simon Cole', phone: '+44 7911 331007' },
  { name: 'Ivy Claire Montgomery', gender: 'female' as const, guardian: 'Rose Montgomery', phone: '+44 7911 331008' },
  { name: 'Jasper Ronald Bell', gender: 'male' as const, guardian: 'Donald Bell', phone: '+44 7911 331009' },
  { name: 'Kira Nicole Romanov', gender: 'female' as const, guardian: 'Olga Romanov', phone: '+44 7911 331010' },
  { name: 'Leo Sebastian Cross', gender: 'male' as const, guardian: 'Alan Cross', phone: '+44 7911 331011' },
  { name: 'Maya Jasmine Lin', gender: 'female' as const, guardian: 'Wei Lin', phone: '+44 7911 331012' },
];

const RAW_STUDENT_NAMES_9B = [
  { name: 'Archie Liam Fletcher', gender: 'male' as const, guardian: 'Gary Fletcher', phone: '+44 7911 441001' },
  { name: 'Bethany Joy Palmer', gender: 'female' as const, guardian: 'Susan Palmer', phone: '+44 7911 441002' },
  { name: 'Charlie Elliot Stone', gender: 'male' as const, guardian: 'Douglas Stone', phone: '+44 7911 441003' },
  { name: 'Daisy Olivia Hart', gender: 'female' as const, guardian: 'Laura Hart', phone: '+44 7911 441004' },
  { name: 'Edward Sean Bradley', gender: 'male' as const, guardian: 'Martin Bradley', phone: '+44 7911 441005' },
  { name: 'Faith Angela Pearson', gender: 'female' as const, guardian: 'Wendy Pearson', phone: '+44 7911 441006' },
  { name: 'Gregory Thomas Shaw', gender: 'male' as const, guardian: 'Arthur Shaw', phone: '+44 7911 441007' },
  { name: 'Harriet Emma Mills', gender: 'female' as const, guardian: 'Christine Mills', phone: '+44 7911 441008' },
  { name: 'Isaac Daniel Barker', gender: 'male' as const, guardian: 'Jonathan Barker', phone: '+44 7911 441009' },
  { name: 'Jessica Lily Marsh', gender: 'female' as const, guardian: 'Peter Marsh', phone: '+44 7911 441010' },
];

export function buildSeedStudents(): Student[] {
  const students: Student[] = [];

  const datasets = [
    { classId: 'cls_10a', list: RAW_STUDENT_NAMES_10A, prefix: '10A' },
    { classId: 'cls_9a', list: RAW_STUDENT_NAMES_9A, prefix: '09A' },
    { classId: 'cls_10b', list: RAW_STUDENT_NAMES_10B, prefix: '10B' },
    { classId: 'cls_9b', list: RAW_STUDENT_NAMES_9B, prefix: '09B' },
  ];

  datasets.forEach((ds) => {
    ds.list.forEach((raw, idx) => {
      const rollNumber = String(idx + 1).padStart(4, '0');
      const studentId = `stu_${ds.classId}_${rollNumber}`;
      const admissionNumber = `ADM-${ds.prefix}-${rollNumber}`;
      const credentialId = `crd_${ds.classId}_${rollNumber}_01`;
      const qrCodeToken = JSON.stringify({
        v: 1,
        sch: 'sch_oakwood_2026',
        sid: studentId,
        cid: credentialId,
      });

      students.push({
        id: studentId,
        rollNumber,
        fullName: raw.name,
        gender: raw.gender,
        guardianName: raw.guardian,
        guardianPhone: raw.phone,
        classId: ds.classId,
        admissionNumber,
        admissionDate: '2026-09-01',
        enrollmentStatus: 'active',
        qrCodeToken,
        activeCredentialId: credentialId,
        revokedCredentialIds: [],
        cardIssuedAt: '2026-09-01T08:00:00.000Z',
        dob: '2010-05-14',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      });
    });
  });

  return students;
}

export function buildSeedAttendanceAndRegisters(students: Student[]): {
  attendance: AttendanceRecord[];
  registers: DailyRegister[];
  auditLogs: AuditEvent[];
} {
  const attendance: AttendanceRecord[] = [];
  const registers: DailyRegister[] = [];
  const auditLogs: AuditEvent[] = [];

  const pastDates = getPastDates(5); // Last 5 school dates including today
  const today = getTodaySchoolDate();

  SEED_CLASSES.forEach((cls) => {
    const classStudents = students.filter((s) => s.classId === cls.id);

    pastDates.forEach((date) => {
      const isToday = date === today;
      let presentCount = 0;
      let absentCount = 0;
      let sickCount = 0;
      let leaveCount = 0;
      let pendingCount = 0;

      classStudents.forEach((student, sIdx) => {
        let status: 'present' | 'absent' | 'sick_leave' | 'approved_leave' | 'pending';
        let method: 'qr_scan' | 'manual_entry' | 'system_default' = 'qr_scan';
        let remarks: string | undefined = undefined;

        if (isToday) {
          // For today, create realistic active states:
          // In 10-A: Most marked via QR, 1 sick, 1 absent, 1 pending
          if (cls.id === 'cls_10a') {
            if (sIdx === 2) {
              status = 'sick_leave';
              remarks = 'Mild fever, guardian notified at 08:15';
              sickCount++;
            } else if (sIdx === 5) {
              status = 'absent';
              remarks = 'Unexcused absence, call placed to parent';
              absentCount++;
            } else if (sIdx === classStudents.length - 1) {
              status = 'pending';
              pendingCount++;
            } else {
              status = 'present';
              presentCount++;
            }
          } else if (cls.id === 'cls_9a') {
            // 9-A is in-progress
            if (sIdx < 10) {
              status = 'present';
              presentCount++;
            } else {
              status = 'pending';
              pendingCount++;
            }
          } else {
            // Other classes today might not be started or partially marked
            status = 'pending';
            pendingCount++;
          }
        } else {
          // Past dates: mostly present with standard natural distribution
          const hash = (sIdx * 17 + date.length + cls.id.charCodeAt(4)) % 10;
          if (hash === 1) {
            status = 'sick_leave';
            remarks = 'Medical appointment confirmed';
            sickCount++;
          } else if (hash === 2) {
            status = 'approved_leave';
            remarks = 'Approved family leave';
            leaveCount++;
          } else if (hash === 3 && sIdx % 3 === 0) {
            status = 'absent';
            remarks = 'Absence reported';
            absentCount++;
          } else {
            status = 'present';
            presentCount++;
          }
        }

        const recordId = `${student.id}_${date}`;
        attendance.push({
          id: recordId,
          studentId: student.id,
          studentRollNumber: student.rollNumber,
          studentName: student.fullName,
          classId: cls.id,
          date,
          timestamp: `${date}T08:32:00.000Z`,
          status,
          method,
          remarks,
          markedBy: cls.assignedTeacherId || 'usr_principal_01',
          markedByName: cls.assignedTeacherId ? 'Assigned Teacher' : 'Principal',
        });
      });

      // Register status
      let regStatus: 'not_started' | 'in_progress' | 'submitted' | 'finalized' | 'correction_required';
      if (isToday) {
        if (cls.id === 'cls_10a') regStatus = 'submitted';
        else if (cls.id === 'cls_9a') regStatus = 'in_progress';
        else regStatus = 'not_started';
      } else {
        regStatus = 'finalized';
      }

      const registerId = `${cls.id}_${date}`;
      registers.push({
        id: registerId,
        classId: cls.id,
        date,
        status: regStatus,
        totalStudents: classStudents.length,
        presentCount,
        absentCount,
        sickCount,
        leaveCount,
        pendingCount,
        submittedBy: regStatus !== 'not_started' ? 'usr_teacher_01' : undefined,
        submittedByName: regStatus !== 'not_started' ? 'Ms. Elena Rostova' : undefined,
        submittedAt: regStatus !== 'not_started' ? `${date}T09:05:00.000Z` : undefined,
        finalizedBy: regStatus === 'finalized' ? 'usr_principal_01' : undefined,
        finalizedByName: regStatus === 'finalized' ? 'Dr. Arthur Sterling' : undefined,
        finalizedAt: regStatus === 'finalized' ? `${date}T10:00:00.000Z` : undefined,
      });
    });
  });

  // Seed audit logs
  auditLogs.push(
    {
      id: 'aud_001',
      timestamp: `${today}T08:00:00.000Z`,
      actorId: 'usr_principal_01',
      actorName: 'Dr. Arthur Sterling',
      actorRole: 'principal',
      action: 'SYSTEM_INITIALIZED',
      entityType: 'school',
      entityId: 'sch_oakwood_2026',
      details: 'SchoolSync Phase 1 local database initialized with Oakwood Academy identity.',
    },
    {
      id: 'aud_002',
      timestamp: `${today}T08:45:00.000Z`,
      actorId: 'usr_teacher_01',
      actorName: 'Ms. Elena Rostova',
      actorRole: 'teacher',
      action: 'REGISTER_SUBMITTED',
      entityType: 'register',
      entityId: `cls_10a_${today}`,
      details: 'Daily attendance register for Grade 10-A submitted to Principal for review.',
    }
  );

  return { attendance, registers, auditLogs };
}
