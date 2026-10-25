/**
 * SchoolSync Cloud Data Storage & Multi-Device Synchronization Service
 * Backed by Firebase Cloud Firestore and local IndexedDB.
 * Guarantees offline-first resilience, duplicate prevention, and clean multi-device restore.
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { dbAdapter } from './db';
import { School, ClassGrade, Student, AttendanceRecord } from '../types';
import { compressImage } from './imageUtils';

export type SyncStatusState = 'synced' | 'pending' | 'failed' | 'syncing' | 'offline';

export interface CloudSummary {
  schoolId: string;
  schoolName: string;
  principalName: string;
  classesCount: number;
  studentsCount: number;
  attendanceCount: number;
  lastUpdated: string;
}

export interface BackupResult {
  success: boolean;
  schoolName: string;
  classesCount: number;
  studentsCount: number;
  attendanceCount: number;
  timestamp: string;
}

export interface RestoreResult {
  success: boolean;
  school: School;
  classesCount: number;
  studentsCount: number;
  attendanceCount: number;
  timestamp: string;
}

const STORAGE_KEY_LAST_SYNC = 'schoolsync_last_cloud_sync';
const STORAGE_KEY_SYNC_STATUS = 'schoolsync_cloud_sync_status';

class CloudSyncService {
  getLastSyncTimestamp(): string | null {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  }

  setLastSyncTimestamp(isoStr: string): void {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, isoStr);
  }

  getSyncStatus(): SyncStatusState {
    if (!navigator.onLine) return 'offline';
    return (localStorage.getItem(STORAGE_KEY_SYNC_STATUS) as SyncStatusState) || 'pending';
  }

  setSyncStatus(status: SyncStatusState): void {
    localStorage.setItem(STORAGE_KEY_SYNC_STATUS, status);
  }

  /**
   * Backs up all local records (School profile, Classes, Students, Attendance) to Cloud Firestore.
   */
  async backupLocalToCloud(currentSchool: School): Promise<BackupResult> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in with your Google or verified account to back up data.');
    }

    if (!navigator.onLine) {
      this.setSyncStatus('offline');
      throw new Error('Device is offline. Cloud backup requires an internet connection.');
    }

    this.setSyncStatus('syncing');

    try {
      const schoolId = currentSchool.id || `sch_${user.uid.substring(0, 12)}`;
      const now = new Date().toISOString();

      // 1. Update User Document link
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'School Owner',
          schoolId,
          role: 'owner',
          updatedAt: now,
        },
        { merge: true }
      );

      // 2. Save School Profile Document
      const schoolDocRef = doc(db, 'schools', schoolId);
      const schoolPayload = {
        id: schoolId,
        ownerUid: user.uid,
        name: currentSchool.name.trim() || 'SchoolSync Academy',
        principalName: currentSchool.principalName?.trim() || 'Headmaster',
        academicYear: currentSchool.academicYear || '2026-2027',
        term: currentSchool.term || 'Term 1',
        country: currentSchool.country || 'General',
        timezone: currentSchool.timezone || 'Local',
        createdAt: currentSchool.createdAt || now,
        updatedAt: now,
      };
      await setDoc(schoolDocRef, schoolPayload, { merge: true });

      // 3. Backup Classes
      const localClasses = await dbAdapter.getAll<ClassGrade>('classes');
      for (const cls of localClasses) {
        const classDocRef = doc(db, 'schools', schoolId, 'classes', cls.id);
        await setDoc(
          classDocRef,
          {
            id: cls.id,
            schoolId,
            name: cls.name,
            section: cls.section || '',
            headmasterName: cls.headmasterName || currentSchool.principalName || '',
            academicYear: cls.academicYear || currentSchool.academicYear || '2026-2027',
            createdAt: cls.createdAt || now,
          },
          { merge: true }
        );
      }

      // 4. Backup Students (preserving leading zeros, photo, QR credentials)
      const localStudents = await dbAdapter.getAll<Student>('students');
      for (const stu of localStudents) {
        // Enforce Firestore 1MB document limit: downscale photos > 80KB to ~25KB
        let safePhoto = stu.photoUrl || '';
        if (safePhoto && safePhoto.length > 80000) {
          try {
            safePhoto = await compressImage(safePhoto, 260, 0.7);
            if (safePhoto.length > 300000) {
              safePhoto = ''; // Safeguard if compression doesn't reduce sufficiently
            }
            // Persist the compressed version back to IndexedDB so local DB is also lean
            stu.photoUrl = safePhoto;
            await dbAdapter.put<Student>('students', stu);
          } catch {
            safePhoto = '';
          }
        }

        const studentDocRef = doc(db, 'schools', schoolId, 'students', stu.id);
        await setDoc(
          studentDocRef,
          {
            id: stu.id,
            schoolId,
            classId: stu.classId,
            rollNumber: stu.rollNumber, // Preserves string with leading zeros
            fullName: stu.fullName,
            guardianName: stu.guardianName || '',
            address: stu.address || '',
            photoUrl: safePhoto,
            qrCodeToken: stu.qrCodeToken,
            activeCredentialId: stu.activeCredentialId || '',
            enrollmentStatus: stu.enrollmentStatus || 'active',
            gender: stu.gender || 'male',
            guardianPhone: stu.guardianPhone || '',
            createdAt: stu.createdAt || now,
            updatedAt: now,
          },
          { merge: true }
        );
      }

      // 5. Backup Attendance Records
      const localAttendance = await dbAdapter.getAll<AttendanceRecord>('attendance');
      // Upload attendance in batches of 200 to prevent payload limits
      const attendanceChunks: AttendanceRecord[][] = [];
      for (let i = 0; i < localAttendance.length; i += 200) {
        attendanceChunks.push(localAttendance.slice(i, i + 200));
      }

      for (const chunk of attendanceChunks) {
        const batch = writeBatch(db);
        for (const att of chunk) {
          const attDocRef = doc(db, 'schools', schoolId, 'attendance', att.id);
          batch.set(
            attDocRef,
            {
              id: att.id,
              schoolId,
              studentId: att.studentId,
              studentRollNumber: att.studentRollNumber || '',
              studentName: att.studentName || '',
              guardianName: att.guardianName || '',
              classId: att.classId,
              date: att.date,
              status: att.status,
              method: att.method || 'qr_scan',
              markedBy: att.markedBy || user.uid,
              markedByName: att.markedByName || user.displayName || 'Authorized Teacher',
              timestamp: att.timestamp || now,
            },
            { merge: true }
          );
        }
        await batch.commit();
      }

      this.setLastSyncTimestamp(now);
      this.setSyncStatus('synced');

      return {
        success: true,
        schoolName: schoolPayload.name,
        classesCount: localClasses.length,
        studentsCount: localStudents.length,
        attendanceCount: localAttendance.length,
        timestamp: now,
      };
    } catch (err: unknown) {
      this.setSyncStatus('failed');
      handleFirestoreError(err, OperationType.WRITE, 'schools');
    }
  }

  /**
   * Inspects the cloud database for the authenticated user and returns record counts
   * so the user can preview what will be restored on another device.
   */
  async checkCloudSchoolSummary(): Promise<CloudSummary | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      // 1. Read User Profile to find linked schoolId
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      let schoolId: string | null = null;
      if (userSnap.exists()) {
        schoolId = userSnap.data()?.schoolId || null;
      }

      if (!schoolId) {
        // Fallback: check /schools/{sch_uid}
        schoolId = `sch_${user.uid.substring(0, 12)}`;
      }

      const schoolDocRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolDocRef);

      if (!schoolSnap.exists()) {
        return null;
      }

      const schoolData = schoolSnap.data();

      // Read classes count
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      // Read students count
      const studentsSnap = await getDocs(collection(db, 'schools', schoolId, 'students'));
      // Read attendance count
      const attendanceSnap = await getDocs(collection(db, 'schools', schoolId, 'attendance'));

      return {
        schoolId,
        schoolName: schoolData.name || 'SchoolSync Academy',
        principalName: schoolData.principalName || 'Headmaster',
        classesCount: classesSnap.size,
        studentsCount: studentsSnap.size,
        attendanceCount: attendanceSnap.size,
        lastUpdated: schoolData.updatedAt || new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Could not read cloud school summary:', err);
      return null;
    }
  }

  /**
   * Restores Cloud records into local IndexedDB storage on this device.
   */
  async restoreCloudToLocal(cloudSummary: CloudSummary): Promise<RestoreResult> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in to restore school records.');
    }

    const { schoolId } = cloudSummary;
    const now = new Date().toISOString();

    try {
      // 1. Fetch School Profile
      const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
      if (!schoolSnap.exists()) {
        throw new Error('Cloud school record not found or inaccessible.');
      }
      const rawSchool = schoolSnap.data();
      const restoredSchool: School = {
        id: schoolId,
        name: rawSchool.name,
        principalName: rawSchool.principalName || 'Headmaster',
        academicYear: rawSchool.academicYear || '2026-2027',
        term: rawSchool.term || 'Term 1',
        country: rawSchool.country || 'General',
        timezone: rawSchool.timezone || 'Local',
        workingDays: [1, 2, 3, 4, 5],
        createdAt: rawSchool.createdAt || now,
        updatedAt: rawSchool.updatedAt || now,
        preferences: {
          cutOffTime: '08:30',
          requireLeaveReason: false,
          allowTeacherCorrectionBeforeFinalize: true,
          defaultStatus: 'pending',
          lateGraceMinutes: 15,
        },
      };

      // 2. Fetch Classes
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const restoredClasses: ClassGrade[] = [];
      classesSnap.forEach((docSnap) => {
        const d = docSnap.data();
        restoredClasses.push({
          id: d.id || docSnap.id,
          name: d.name,
          section: d.section || '',
          headmasterName: d.headmasterName || restoredSchool.principalName,
          academicYear: d.academicYear || restoredSchool.academicYear,
          createdAt: d.createdAt || now,
        });
      });

      // 3. Fetch Students
      const studentsSnap = await getDocs(collection(db, 'schools', schoolId, 'students'));
      const restoredStudents: Student[] = [];
      studentsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        restoredStudents.push({
          id: d.id || docSnap.id,
          rollNumber: d.rollNumber, // Preserves leading zeros
          fullName: d.fullName,
          gender: d.gender || 'male',
          guardianName: d.guardianName || '',
          guardianPhone: d.guardianPhone || '',
          classId: d.classId,
          address: d.address || '',
          photoUrl: d.photoUrl || undefined,
          qrCodeToken: d.qrCodeToken,
          activeCredentialId: d.activeCredentialId || '',
          enrollmentStatus: d.enrollmentStatus || 'active',
          createdAt: d.createdAt || now,
          updatedAt: d.updatedAt || now,
        });
      });

      // 4. Fetch Attendance
      const attendanceSnap = await getDocs(collection(db, 'schools', schoolId, 'attendance'));
      const restoredAttendance: AttendanceRecord[] = [];
      attendanceSnap.forEach((docSnap) => {
        const d = docSnap.data();
        restoredAttendance.push({
          id: d.id || docSnap.id,
          studentId: d.studentId,
          studentRollNumber: d.studentRollNumber || '',
          studentName: d.studentName || '',
          guardianName: d.guardianName || '',
          classId: d.classId,
          date: d.date,
          status: d.status,
          method: d.method || 'qr_scan',
          markedBy: d.markedBy || user.uid,
          markedByName: d.markedByName || user.displayName || 'Authorized Teacher',
          timestamp: d.timestamp || now,
        });
      });

      // 5. Safely persist into local IndexedDB
      await dbAdapter.put<School>('schools', restoredSchool);
      if (restoredClasses.length > 0) {
        await dbAdapter.putMany<ClassGrade>('classes', restoredClasses);
      }
      if (restoredStudents.length > 0) {
        await dbAdapter.putMany<Student>('students', restoredStudents);
      }
      if (restoredAttendance.length > 0) {
        await dbAdapter.putMany<AttendanceRecord>('attendance', restoredAttendance);
      }

      this.setLastSyncTimestamp(now);
      this.setSyncStatus('synced');

      return {
        success: true,
        school: restoredSchool,
        classesCount: restoredClasses.length,
        studentsCount: restoredStudents.length,
        attendanceCount: restoredAttendance.length,
        timestamp: now,
      };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.GET, `schools/${schoolId}`);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
