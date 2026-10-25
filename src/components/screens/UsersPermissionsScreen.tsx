import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Check,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { User } from '../../types';
import { schoolService } from '../../services/schoolService';

export const UsersPermissionsScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await schoolService.getUsers();
        setUsers(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const PERMISSIONS_MATRIX = [
    { capability: 'Manage School Identity & Working Calendar', principal: true, teacher: false },
    { capability: 'Create & Manage Academic Classes / Sections', principal: true, teacher: false },
    { capability: 'Register & Assign Faculty Members', principal: true, teacher: false },
    { capability: 'School-wide Student Directory & Registration', principal: true, teacher: true },
    { capability: 'Open & Mark Assigned Class Registers', principal: true, teacher: true },
    { capability: 'Submit Daily Register for Review', principal: false, teacher: true },
    { capability: 'Finalize & Lock Daily Registers', principal: true, teacher: false },
    { capability: 'Reopen Finalized Registers with Audit Justification', principal: true, teacher: false },
    { capability: 'School-wide Attendance Analytics & Chronic Flags', principal: true, teacher: false },
    { capability: 'Database Backup, JSON Export & Recovery Restore', principal: true, teacher: false },
    { capability: 'Inspect Immutable Audit Trails', principal: true, teacher: false },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Roles & Access Permissions
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Role-based security policies, authorization boundaries, and client profile management.
        </p>
      </div>

      {/* Honest Authentication Implementation Notice */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-amber-950">
          <Info className="w-4 h-4 text-amber-600" />
          <span>Phase 1 Authentication & Security Implementation State</span>
        </p>
        <p className="leading-relaxed text-amber-800">
          In Phase 1, role-aware navigation and permissions are enforced strictly inside the application and local data-access service layer. The current user profile switcher allows rapid testing between Principal and Teacher workflows in offline environments. Cryptographic multi-user server authentication (JWT / session tokens) is planned for Phase 2 when multi-device synchronization is deployed.
        </p>
      </div>

      {/* Active User Accounts in Local Database */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">Registered Application Accounts</h2>
          <p className="text-xs text-slate-500">Stored locally in IndexedDB</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
                <th className="py-2.5 px-4">Full Name</th>
                <th className="py-2.5 px-4">Username</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.username}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        u.role === 'principal'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {u.role === 'principal' ? (
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                      ) : (
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-700 font-medium">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Capabilities Matrix */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">Role Capabilities & Enforcement Matrix</h2>
          <p className="text-xs text-slate-500">Separation of duties between administrative and teaching staff</p>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wider">
              <th className="py-2.5 px-4">Functional Capability</th>
              <th className="py-2.5 px-4 text-center w-36 bg-amber-50/30">Principal</th>
              <th className="py-2.5 px-4 text-center w-36 bg-emerald-50/30">Teacher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERMISSIONS_MATRIX.map((perm, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 text-slate-800 font-medium">{perm.capability}</td>
                <td className="py-3 px-4 text-center bg-amber-50/20">
                  {perm.principal ? (
                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </td>
                <td className="py-3 px-4 text-center bg-emerald-50/20">
                  {perm.teacher ? (
                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
