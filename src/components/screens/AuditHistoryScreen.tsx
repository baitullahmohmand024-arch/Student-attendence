import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  RefreshCw,
  FileText
} from 'lucide-react';
import { AuditEvent } from '../../types';
import { schoolService } from '../../services/schoolService';

export const AuditHistoryScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await schoolService.getAuditLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = filterEntityType === 'all' || log.entityType === filterEntityType;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Immutable Audit Trail & Activity Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Traceable log of all register submissions, finalizations, corrections, and database operations.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by action, actor, or detail text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded border border-slate-300 focus:outline-none focus:border-slate-500"
            />
          </div>

          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="text-xs bg-white px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Entities</option>
            <option value="register">Daily Registers</option>
            <option value="attendance">Attendance Records</option>
            <option value="student">Student Registry</option>
            <option value="class">Classes</option>
            <option value="teacher">Teachers</option>
            <option value="school">School Identity</option>
            <option value="backup">Backup Operations</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums text-right">
          Showing {filteredLogs.length} of {logs.length} logged events
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit history...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-40">Timestamp</th>
                  <th className="py-2.5 px-4 w-40">Action</th>
                  <th className="py-2.5 px-4 w-28">Entity</th>
                  <th className="py-2.5 px-4">Details & Justification</th>
                  <th className="py-2.5 px-4 text-right w-44">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-500">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed max-w-md">
                      {log.details}
                      <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                        ID: {log.entityId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-slate-900 block">{log.actorName}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        {log.actorRole}
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
