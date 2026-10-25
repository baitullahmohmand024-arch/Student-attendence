import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  ClipboardCheck,
  QrCode,
  FileCheck2,
  CalendarDays,
  BarChart3,
  FileDown,
  Database,
  Settings,
  ShieldCheck,
  History,
  X,
  Compass
} from 'lucide-react';
import { UserRole } from '../../types';

export type ScreenId =
  | 'principal_dashboard'
  | 'teacher_dashboard'
  | 'classes'
  | 'students'
  | 'teachers'
  | 'daily_register'
  | 'qr_scanner'
  | 'corrections'
  | 'monthly_register'
  | 'analytics'
  | 'export_center'
  | 'backup_restore'
  | 'school_settings'
  | 'users_permissions'
  | 'audit_history'
  | 'setup_wizard';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  userRole: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  section?: 'operations' | 'records' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  // Principal & Teacher primary dashboards
  {
    id: 'principal_dashboard',
    label: 'Principal Overview',
    icon: LayoutDashboard,
    roles: ['principal'],
    section: 'operations',
  },
  {
    id: 'teacher_dashboard',
    label: 'Teacher Classroom',
    icon: LayoutDashboard,
    roles: ['teacher'],
    section: 'operations',
  },

  // Daily operations
  {
    id: 'daily_register',
    label: 'Daily Register',
    icon: ClipboardCheck,
    roles: ['principal', 'teacher'],
    section: 'operations',
  },
  {
    id: 'qr_scanner',
    label: 'QR Scanner',
    icon: QrCode,
    roles: ['principal', 'teacher'],
    section: 'operations',
  },
  {
    id: 'corrections',
    label: 'Leave & Corrections',
    icon: FileCheck2,
    roles: ['principal', 'teacher'],
    section: 'operations',
  },

  // Records & Registers
  {
    id: 'monthly_register',
    label: 'Monthly Register',
    icon: CalendarDays,
    roles: ['principal', 'teacher'],
    section: 'records',
  },
  {
    id: 'students',
    label: 'Students Directory',
    icon: Users,
    roles: ['principal', 'teacher'],
    section: 'records',
  },
  {
    id: 'classes',
    label: 'Classes & Sections',
    icon: GraduationCap,
    roles: ['principal'],
    section: 'records',
  },
  {
    id: 'teachers',
    label: 'Teachers & Assignments',
    icon: UserCheck,
    roles: ['principal'],
    section: 'records',
  },
  {
    id: 'analytics',
    label: 'Analytics & Insights',
    icon: BarChart3,
    roles: ['principal'],
    section: 'records',
  },
  {
    id: 'export_center',
    label: 'Print & PDF Export',
    icon: FileDown,
    roles: ['principal', 'teacher'],
    section: 'records',
  },

  // Administration & Governance
  {
    id: 'audit_history',
    label: 'Audit History',
    icon: History,
    roles: ['principal'],
    section: 'admin',
  },
  {
    id: 'backup_restore',
    label: 'Backup & Restore',
    icon: Database,
    roles: ['principal'],
    section: 'admin',
  },
  {
    id: 'users_permissions',
    label: 'Roles & Access',
    icon: ShieldCheck,
    roles: ['principal'],
    section: 'admin',
  },
  {
    id: 'school_settings',
    label: 'School Settings',
    icon: Settings,
    roles: ['principal'],
    section: 'admin',
  },
  {
    id: 'setup_wizard',
    label: 'Setup Wizard',
    icon: Compass,
    roles: ['principal'],
    section: 'admin',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  userRole,
  isOpenMobile,
  onCloseMobile,
}) => {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const sections = [
    { key: 'operations', title: 'Daily Operations' },
    { key: 'records', title: 'Registers & Records' },
    { key: 'admin', title: 'Administration' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 w-64 select-none">
      {/* Mobile close bar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
        <span className="font-semibold text-white text-sm">Navigation Menu</span>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((sec) => {
          const itemsInSection = visibleItems.filter((i) => i.section === sec.key);
          if (itemsInSection.length === 0) return null;

          return (
            <div key={sec.key} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider">
                {sec.title}
              </div>
              <div className="space-y-0.5 pt-1">
                {itemsInSection.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectScreen(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-colors text-left ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role scope badge in sidebar footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Active Role:</span>
          <span className="font-mono text-emerald-400 font-semibold uppercase">{userRole}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="no-print hidden lg:block h-[calc(100vh-4rem)] sticky top-16 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="no-print lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={onCloseMobile} />
          <div className="relative z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
