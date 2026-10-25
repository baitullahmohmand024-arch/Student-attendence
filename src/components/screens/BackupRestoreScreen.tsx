import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileJson,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { schoolService } from '../../services/schoolService';
import { BackupPayload, School } from '../../types';

interface BackupRestoreScreenProps {
  school: School | null;
  onDatabaseResetOrRestored: () => void;
}

export const BackupRestoreScreen: React.FC<BackupRestoreScreenProps> = ({
  school,
  onDatabaseResetOrRestored,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importValidationResult, setImportValidationResult] = useState<{
    valid: boolean;
    schoolName?: string;
    counts?: BackupPayload['recordCounts'];
    message?: string;
  } | null>(null);

  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const [showConfirmResetDemoModal, setShowConfirmResetDemoModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export JSON backup
  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);
      const jsonStr = await schoolService.exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `schoolsync_backup_${school?.code || 'school'}_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage('Full database JSON backup downloaded securely.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  };

  // Inspect & Validate uploaded/pasted JSON before restoring
  const handleValidateJson = (text: string) => {
    setImportJsonText(text);
    if (!text.trim()) {
      setImportValidationResult(null);
      return;
    }

    try {
      const parsed: BackupPayload = JSON.parse(text);
      if (!parsed.version || !parsed.data) {
        setImportValidationResult({
          valid: false,
          message: 'Missing root "version" or "data" envelope in JSON payload.',
        });
        return;
      }

      setImportValidationResult({
        valid: true,
        schoolName: parsed.schoolName || parsed.data.school?.name || 'SchoolSync Database',
        counts: parsed.recordCounts || {
          classes: parsed.data.classes?.length || 0,
          teachers: parsed.data.teachers?.length || 0,
          students: parsed.data.students?.length || 0,
          attendance: parsed.data.attendance?.length || 0,
          registers: parsed.data.registers?.length || 0,
          auditLogs: parsed.data.auditLogs?.length || 0,
        },
      });
    } catch {
      setImportValidationResult({
        valid: false,
        message: 'Syntax error: The text does not parse as valid JSON.',
      });
    }
  };

  // Handle file select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleValidateJson(content);
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    try {
      setErrorMessage(null);
      const res = await schoolService.validateAndImportBackup(importJsonText);
      if (!res.success) {
        setErrorMessage(res.message);
        setShowConfirmRestoreModal(false);
        return;
      }

      setShowConfirmRestoreModal(false);
      setImportJsonText('');
      setImportValidationResult(null);
      setSuccessMessage(res.message);
      onDatabaseResetOrRestored();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      setErrorMessage(message);
      setShowConfirmRestoreModal(false);
    }
  };

  // Reset to seed demo data
  const handleResetToDemo = async () => {
    try {
      setErrorMessage(null);
      await schoolService.initializeWithSeedData();
      setShowConfirmResetDemoModal(false);
      setSuccessMessage('Database restored to Oakwood Academy sample dataset with active attendance.');
      onDatabaseResetOrRestored();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      setErrorMessage(message);
      setShowConfirmResetDemoModal(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Database Backup, Import & Disaster Recovery
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Local IndexedDB persistence manager, JSON schema validation, and export archives.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Offline architecture honesty notice */}
      <div className="p-4 rounded-lg bg-slate-900 text-slate-200 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Local-First Storage Architecture Notice</p>
          <p className="text-slate-400 leading-relaxed">
            SchoolSync Phase 1 operates purely within the browser's persistent <strong>IndexedDB</strong> store. Data remains securely preserved across device reboots and page refreshes without internet connectivity. Multi-device central server synchronization is scheduled for Phase 2. Always maintain periodic JSON backups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Export Full JSON Backup */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Export Verified JSON Backup</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Downloads a full schema-compliant JSON file containing school settings, teachers, class rosters, students with QR tokens, attendance logs, and audit trails.
            </p>
          </div>

          <button
            onClick={handleExportJSON}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isExporting ? 'Generating JSON...' : 'Download JSON Backup'}</span>
          </button>
        </div>

        {/* Card 2: Reset to Demo / Sample Data */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset to Verified Demo Dataset</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Re-initializes IndexedDB with the Oakwood Academy demo dataset, including 4 classes, 51 students, faculty members, and populated attendance history.
            </p>
          </div>

          <button
            onClick={() => setShowConfirmResetDemoModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Import & Restore Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Import & Restore From Backup</h3>
          <p className="text-xs text-slate-500">
            Upload or paste an official SchoolSync backup. The file will be pre-validated against the schema before applying.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Select Backup File (.json):
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Or Paste JSON Raw Content:
            </label>
            <textarea
              rows={5}
              value={importJsonText}
              onChange={(e) => handleValidateJson(e.target.value)}
              placeholder='{"version": "1.0.0", "data": { ... }}'
              className="w-full p-2.5 font-mono text-[11px] rounded border border-slate-300 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Validation Feedback */}
          {importValidationResult && (
            <div
              className={`p-3 rounded border text-xs ${
                importValidationResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importValidationResult.valid ? (
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Valid SchoolSync Backup Schema</span>
                  </p>
                  <p>
                    Target: <strong>{importValidationResult.schoolName}</strong>
                  </p>
                  {importValidationResult.counts && (
                    <p className="font-mono text-[11px]">
                      Records: {importValidationResult.counts.students} students ·{' '}
                      {importValidationResult.counts.classes} classes ·{' '}
                      {importValidationResult.counts.attendance} attendance records ·{' '}
                      {importValidationResult.counts.auditLogs} audit events.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importValidationResult.message}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowConfirmRestoreModal(true)}
              disabled={!importValidationResult || !importValidationResult.valid}
              className={`px-4 py-2 rounded text-xs font-semibold transition-colors ${
                importValidationResult?.valid
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              Restore Database from Backup
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {showConfirmRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Confirm Database Overwrite</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Restoring this backup will replace current local school records with the uploaded file.
              This operation cannot be undone. Are you sure you wish to proceed?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmRestoreModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
              >
                Confirm & Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Demo Reset */}
      {showConfirmResetDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset to Demo School?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will reset the IndexedDB stores to Oakwood International Academy demo state. Any custom students or classes you entered will be replaced.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmResetDemoModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDemo}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Reset to Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
