import React, { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  UserPlus,
  FileDown,
  Building,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { School, SchoolAnalytics, AuditEvent } from '../../types';
import { schoolService } from '../../services/schoolService';
import { ScreenId } from '../layout/Sidebar';
import { StatusBadge } from '../common/StatusBadge';

interface PrincipalDashboardProps {
  school: School | null;
  onNavigate: (screen: ScreenId) => void;
  currentDate: string;
}

export const PrincipalDashboard: React.FC<PrincipalDashboardProps> = ({
  school,
  onNavigate,
  currentDate,
}) => {
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await schoolService.getSchoolAnalytics(currentDate);
      const logs = await schoolService.getAuditLogs();
      setAnalytics(data);
      setRecentLogs(logs.slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  if (loading || !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-slate-200 animate-pulse rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Principal Administrative Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {school?.name} · Attendance summary and operational registers for{' '}
            <span className="font-mono font-medium text-slate-800">{currentDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('qr_scanner')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Start Attendance</span>
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Counts</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {analytics.totalStudents}
            </span>
            <p className="text-xs text-slate-500 mt-1">Active registered learners</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Present Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
                {analytics.todayOverallRate}%
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-600">
                ({analytics.todayPresentCount} present)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Confirmed student attendance</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
              {analytics.todayPendingCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">Students awaiting review</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Registers Pending</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-rose-700 font-mono tabular-nums">
                {analytics.pendingRegistersCount}
              </span>
              <span className="text-xs text-slate-500">/ {analytics.totalRegistersToday} classes</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Unfinalized daily registers</p>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('daily_register')}
          className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-left"
        >
          <div>
            <p className="text-xs font-semibold">Daily Register</p>
            <p className="text-[11px] text-slate-400">Review & mark attendance</p>
          </div>
          <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('students')}
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
        >
          <div>
            <p className="text-xs font-semibold text-slate-900">Student Directory</p>
            <p className="text-[11px] text-slate-500">Register or print cards</p>
          </div>
          <UserPlus className="w-4 h-4 text-slate-600 shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('classes')}
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
        >
          <div>
            <p className="text-xs font-semibold text-slate-900">Class Roster</p>
            <p className="text-[11px] text-slate-500">Grades & sections</p>
          </div>
          <Building className="w-4 h-4 text-slate-600 shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('export_center')}
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
        >
          <div>
            <p className="text-xs font-semibold text-slate-900">Export Center</p>
            <p className="text-[11px] text-slate-500">Print registers & sheets</p>
          </div>
          <FileDown className="w-4 h-4 text-slate-600 shrink-0" />
        </button>
      </div>

      {/* Main Grid: Class Registers Status & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Attendance Status Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Today's Class Registers</h2>
              <p className="text-xs text-slate-500">Status across all grade sections for {currentDate}</p>
            </div>
            <button
              onClick={() => onNavigate('daily_register')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Open Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4 text-right">Enrolled</th>
                  <th className="py-2.5 px-4 text-right">Present</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4">Register State</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analytics.classSummaries.map((c) => (
                  <tr key={c.classId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.className}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {c.total}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {c.present}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {c.rate}%
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate('daily_register')}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log / Recent Operations Feed (1 col) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Audit Trail</h2>
              <p className="text-xs text-slate-500">Immutable trace of changes</p>
            </div>
            <button
              onClick={() => onNavigate('audit_history')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[380px]">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit activity recorded yet.</p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded border border-slate-100 bg-slate-50/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    Actor: <span className="font-medium text-slate-700">{log.actorName}</span> (
                    {log.actorRole})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
