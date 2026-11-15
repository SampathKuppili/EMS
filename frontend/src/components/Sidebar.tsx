import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  WalletCards,
  CheckCheck,
  CalendarDays,
  ShieldCheck,
  BarChart3,
  UserCheck,
  Bell,
  LogOut,
  X,
  Clock,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  pendingApprovalsCount?: number;
  unreadNotificationsCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
  pendingApprovalsCount = 0,
  unreadNotificationsCount = 0,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === 'ADMIN' || user.is_admin;
  const isHR = isAdmin || user.role === 'HR_MANAGER' || Boolean(user.is_hr);
  const isManager = user.role === 'MANAGER' || isHR;

  const savedAvatar = localStorage.getItem(`avatar_${user.id}`);

  const sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
        { label: 'Attendance', to: '/attendance', icon: Clock },
        { label: 'Apply for Leave', to: '/apply', icon: CalendarPlus },
        { label: 'My Requests', to: '/requests', icon: History },
        { label: 'Leave Balances', to: '/balances', icon: WalletCards },
      ],
    },
    ...(isManager
      ? [
          {
            title: 'Team Management',
            items: [
              {
                label: 'Approval Inbox',
                to: '/approvals',
                icon: CheckCheck,
                badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
                badgeColor: 'bg-amber-100 text-amber-800 font-bold',
              },
              { label: 'Team Calendar', to: '/calendar', icon: CalendarDays },
              { label: 'Analytics & Reports', to: '/reports', icon: BarChart3 },
            ],
          },
        ]
      : []),
    ...(isHR
      ? [
          {
            title: 'Administration',
            items: [
              { label: 'Admin & HR Management', to: '/hr', icon: ShieldCheck },
              { label: 'Leave Types & Policies', to: '/leave-types', icon: Briefcase },
            ],
          },
        ]
      : []),
    {
      title: 'Account',
      items: [
        {
          label: 'Notifications',
          to: '/notifications',
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
          badgeColor: 'bg-indigo-100 text-indigo-800 font-bold',
        },
        { label: 'Profile Settings', to: '/profile', icon: UserCheck },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 select-none">
      {/* Brand Header */}
      <div
        className={`h-16 border-b border-slate-100 flex items-center ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs transition group cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <span className="group-hover:hidden transition-all">LF</span>
            <PanelLeftOpen className="w-4 h-4 hidden group-hover:block transition-all" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs shrink-0">
                LF
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm text-slate-900 tracking-tight block truncate">LeaveFlow</span>
                <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate">
                  Enterprise EMS
                </span>
              </div>
            </div>

            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav
        className={`flex-1 py-4 space-y-4 overflow-y-auto overflow-x-hidden ${
          collapsed ? 'px-2' : 'px-3'
        }`}
      >
        {sections.map((sec) => (
          <div key={sec.title}>
            {!collapsed ? (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </p>
            ) : (
              <div className="border-t border-slate-100 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center rounded-lg text-xs font-semibold transition duration-150 ${
                        collapsed
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-indigo-50/90 text-indigo-700 font-bold border border-indigo-200/60 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition ${
                          item.badge !== undefined && collapsed ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </div>

                    {/* Badge when expanded */}
                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Small badge dot when collapsed */}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Card at Bottom */}
      <div className={`p-2.5 border-t border-slate-100 bg-slate-50/60 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed ? (
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {savedAvatar ? (
                <img
                  src={savedAvatar}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.full_name}
                </p>
                <span className="text-[10px] font-medium text-slate-400 truncate block">
                  {user.role === 'ADMIN' ? 'Administrator' : user.role === 'HR_MANAGER' ? 'HR Manager' : user.role === 'MANAGER' ? 'Team Lead' : 'Staff'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="relative cursor-pointer"
              title={`${user.full_name} (${user.role})`}
            >
              {savedAvatar ? (
                <img
                  src={savedAvatar}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-indigo-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left with Collapsible Width) */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 z-20 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
