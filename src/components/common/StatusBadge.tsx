import React from 'react';
import { AttendanceStatus, RegisterStatus } from '../../types';

interface StatusBadgeProps {
  status: AttendanceStatus | RegisterStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'present':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          Present
        </span>
      );

    case 'absent':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-rose-200 bg-rose-50 text-rose-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" aria-hidden="true" />
          Absent
        </span>
      );

    case 'sick_leave':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-amber-200 bg-amber-50 text-amber-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" aria-hidden="true" />
          Sick Leave
        </span>
      );

    case 'approved_leave':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-sky-200 bg-sky-50 text-sky-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600" aria-hidden="true" />
          Approved Leave
        </span>
      );

    case 'holiday':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-purple-200 bg-purple-50 text-purple-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" aria-hidden="true" />
          Holiday
        </span>
      );

    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-slate-300 bg-slate-100 text-slate-700 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          Pending Review
        </span>
      );

    case 'finalized':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          Finalized
        </span>
      );

    case 'submitted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-indigo-200 bg-indigo-50 text-indigo-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" aria-hidden="true" />
          Submitted
        </span>
      );

    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-amber-200 bg-amber-50 text-amber-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" aria-hidden="true" />
          In Progress
        </span>
      );

    case 'correction_required':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-rose-200 bg-rose-50 text-rose-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" aria-hidden="true" />
          Correction Required
        </span>
      );

    case 'not_started':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded border border-slate-200 bg-slate-50 text-slate-600 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          Not Started
        </span>
      );
  }
};
