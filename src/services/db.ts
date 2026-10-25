/**
 * IndexedDB Database Adapter for SchoolSync
 * Provides persistent, offline-first local storage for all school records.
 */

const DB_NAME = 'SchoolSync_LocalDB';
const DB_VERSION = 1;

export interface IDataStoreAdapter {
  getAll<T>(storeName: string): Promise<T[]>;
  get<T>(storeName: string, id: string): Promise<T | null>;
  put<T>(storeName: string, item: T): Promise<void>;
  putMany<T>(storeName: string, items: T[]): Promise<void>;
  delete(storeName: string, id: string): Promise<void>;
  clear(storeName: string): Promise<void>;
  count(storeName: string): Promise<number>;
}

class IndexedDBAdapter implements IDataStoreAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Stores definition
        if (!db.objectStoreNames.contains('schools')) {
          db.createObjectStore('schools', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('teachers')) {
          const teacherStore = db.createObjectStore('teachers', { keyPath: 'id' });
          teacherStore.createIndex('employeeId', 'employeeId', { unique: false });
        }

        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('classId', 'classId', { unique: false });
          studentStore.createIndex('rollNumber', 'rollNumber', { unique: false });
          studentStore.createIndex('enrollmentStatus', 'enrollmentStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('attendance')) {
          const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attStore.createIndex('classId', 'classId', { unique: false });
          attStore.createIndex('date', 'date', { unique: false });
          attStore.createIndex('studentId', 'studentId', { unique: false });
          attStore.createIndex('class_date', ['classId', 'date'], { unique: false });
        }

        if (!db.objectStoreNames.contains('registers')) {
          const regStore = db.createObjectStore('registers', { keyPath: 'id' });
          regStore.createIndex('classId', 'classId', { unique: false });
          regStore.createIndex('date', 'date', { unique: false });
          regStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB database.'));
      };
    });

    return this.dbPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      items.forEach((item) => store.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const dbAdapter = new IndexedDBAdapter();
