import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap
} from 'lucide-react';
import { School, SchoolAnalytics } from '../../types';
import { schoolService } from '../../services/schoolService';

interface AnalyticsScreenProps {
  school: School | null;
  currentDate: string;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ school, currentDate }) => {
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await schoolService.getSchoolAnalytics(currentDate);
        setAnalytics(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentDate]);

  if (loading || !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="h-8 bg-slate-200 animate-pulse rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 animate-pulse rounded" />
          <div className="h-32 bg-slate-200 animate-pulse rounded" />
          <div className="h-32 bg-slate-200 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const totalAbsences = analytics.todayAbsentCount + analytics.todaySickCount + analytics.todayLeaveCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Attendance Analytics & Early Warnings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time metrics, class comparison distributions, and chronic absenteeism intervention flags.
        </p>
      </div>

      {/* Top 3 High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Overall School Presence Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-bold font-mono tracking-tight text-emerald-700 tabular-nums">
              {analytics.todayOverallRate}%
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.todayPresentCount} students confirmed present today
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Unexcused & Excused Absences</span>
            <Users className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-bold font-mono tracking-tight text-rose-700 tabular-nums">
              {totalAbsences}
            </span>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Absent: {analytics.todayAbsentCount} · Sick: {analytics.todaySickCount} · Leave: {analytics.todayLeaveCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Chronic Absence Flags</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-bold font-mono tracking-tight text-amber-700 tabular-nums">
              {analytics.chronicAbsenceAlerts.length}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Learners below 85% attendance across recent sessions
            </p>
          </div>
        </div>
      </div>

      {/* Class Comparison Bar Matrix */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Class Attendance Comparison ({currentDate})
          </h2>
          <p className="text-xs text-slate-500">
            Attendance percentages across active grade sections.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {analytics.classSummaries.map((c) => (
            <div key={c.classId} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-800 font-semibold">{c.className}</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {c.present} / {c.total} present ({c.rate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    c.rate >= 90
                      ? 'bg-emerald-600'
                      : c.rate >= 75
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(c.rate, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chronic Absenteeism Early Intervention Alert Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-2">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-4 h-4" />
            <h2 className="text-base font-bold text-slate-900">
              Chronic Absenteeism Intervention Register
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Learners requiring pastoral intervention or guardian consultation based on cumulative recorded attendance.
          </p>
        </div>

        {analytics.chronicAbsenceAlerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No students currently meet the chronic absenteeism criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Roll</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4 text-right">Absence Count</th>
                  <th className="py-2.5 px-4 text-right">Cumulative Rate</th>
                  <th className="py-2.5 px-4 text-right">Intervention State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.chronicAbsenceAlerts.map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                      {st.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.studentName}</td>
                    <td className="py-3 px-4 text-slate-700">{st.className}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700">
                      {st.absenceCount} days
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {st.attendanceRate}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        Action Required
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
