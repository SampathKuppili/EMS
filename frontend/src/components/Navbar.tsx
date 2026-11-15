import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Menu,
  Plus,
  CheckCheck,
  User,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { NotificationItem, TodayAttendanceStatus } from '../api/types';
import { Link, useLocation } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  onToggleCollapse?: () => void;
  isSidebarCollapsed?: boolean;
  unreadCount?: number;
  onRefreshNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  unreadCount = 0,
  onRefreshNotifications,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'PASSWORD' | 'PROFILE' | 'PREFERENCES'>('PASSWORD');

  // Quick Attendance Punch State in Navbar
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceStatus | null>(null);
  const [punchLoading, setPunchLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const savedAvatar = user ? localStorage.getItem(`avatar_${user.id}`) : null;

  // Fetch quick attendance status for Navbar
  const fetchNavbarAttendance = async () => {
    try {
      const res = await apiClient.get<TodayAttendanceStatus>('/attendance/today/');
      setTodayAttendance(res.data);
      if (res.data.record && res.data.record.is_checked_in) {
        setElapsedSeconds(res.data.elapsed_seconds || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNavbarAttendance();
    const interval = setInterval(fetchNavbarAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Timer counter when checked in
  useEffect(() => {
    if (!todayAttendance?.record?.is_checked_in) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [todayAttendance?.record?.is_checked_in]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickCheckIn = async () => {
    setPunchLoading(true);
    try {
      await apiClient.post('/attendance/check-in/', { notes: 'Punched in via top header' });
      await fetchNavbarAttendance();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to check in.');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleQuickCheckOut = async () => {
    if (!window.confirm('Are you sure you want to check out now?')) return;
    setPunchLoading(true);
    try {
      await apiClient.post('/attendance/check-out/', { notes: 'Punched out via top header' });
      await fetchNavbarAttendance();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to check out.');
    } finally {
      setPunchLoading(false);
    }
  };

  // Derive human-readable page name for breadcrumbs
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Executive Overview';
      case '/apply':
        return 'Apply for Leave';
      case '/attendance':
        return 'Attendance & Punch';
      case '/requests':
        return 'Leave Applications';
      case '/balances':
        return 'Quota Balances';
      case '/approvals':
        return 'Approval Inbox';
      case '/calendar':
        return 'Team Calendar';
      case '/hr':
        return 'HR Administration';
      case '/reports':
        return 'Reports & Analytics';
      case '/profile':
        return 'Profile Settings';
      case '/notifications':
        return 'Notifications';
      default:
        return 'Portal';
    }
  };

  const fetchDropdownNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications/?limit=5');
      setNotifications(res.data.results || res.data.slice(0, 5));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (notificationsOpen) {
      fetchDropdownNotifications();
    }
  }, [notificationsOpen]);

  const markAsRead = async (id: number) => {
    try {
      await apiClient.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (onRefreshNotifications) onRefreshNotifications();
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onRefreshNotifications) onRefreshNotifications();
    } catch {}
  };

  if (!user) return null;

  const isCheckedIn = todayAttendance?.record?.is_checked_in;
  const isCompleted = todayAttendance?.record?.is_completed;
  const canCheckIn = todayAttendance?.can_check_in;
  const canCheckOut = todayAttendance?.can_check_out;

  return (
    <>
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs">
        {/* Left: Mobile Toggle & Minimal Breadcrumb */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">Portal</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">{getPageTitle(location.pathname)}</span>
          </div>
        </div>

        {/* Right: Attendance Actions, Notifications, User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* =========================================================================
              CHECK IN & CHECK OUT BUTTONS IN NAVBAR (REQUIREMENT 3)
              ========================================================================= */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isCheckedIn && (
              <div className="hidden xs:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">{formatElapsed(elapsedSeconds)}</span>
              </div>
            )}

            {/* Prominent Check Out Button when user is checked in */}
            {canCheckOut && (
              <button
                id="navbar-checkout-btn"
                onClick={handleQuickCheckOut}
                disabled={punchLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                title="Check Out for the day"
              >
                {punchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Check Out</span>
                  </>
                )}
              </button>
            )}

            {/* Check In Button when user can check in */}
            {canCheckIn && (
              <button
                onClick={handleQuickCheckIn}
                disabled={punchLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                title="Record Check-In timestamp"
              >
                {punchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Check In</span>
                  </>
                )}
              </button>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shift Done</span>
              </span>
            )}
          </div>

          {/* Quick Apply Button */}
          {location.pathname !== '/apply' && (
            <Link
              to="/apply"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </Link>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3.5 hover:bg-slate-50 cursor-pointer transition text-left ${
                            !n.is_read ? 'bg-slate-50/70' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-slate-100 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* =========================================================================
              PROFILE DROPDOWN BUTTON & MENU (REQUIREMENT 2)
              ========================================================================= */}
          <div className="relative pl-2 border-l border-slate-200">
            <button
              id="profile-dropdown-btn"
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition group focus:outline-none"
              aria-label="User profile menu"
            >
              {savedAvatar ? (
                <img
                  src={savedAvatar}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-indigo-600 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition">
                  {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left pr-1">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {user.first_name || user.full_name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {user.role === 'HR_MANAGER' ? 'HR Manager' : user.role === 'ADMIN' ? 'Admin' : 'Staff'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
            </button>

            {/* PROFILE DROPDOWN MENU */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Dropdown Header Card */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      {savedAvatar ? (
                        <img
                          src={savedAvatar}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-indigo-600 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {user.profile?.department_name || 'Engineering'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="p-1.5 space-y-0.5">
                    {/* Settings Option (Required) */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSettingsDefaultTab('PASSWORD');
                        setSettingsModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition text-left"
                    >
                      <Settings className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span>Settings</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Change password, profile images, preferences
                        </span>
                      </div>
                    </button>

                    {/* Change Profile Photo directly */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setSettingsDefaultTab('PROFILE');
                        setSettingsModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition text-left"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <div>
                        <span>Change Profile Image</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Choose avatar or upload photo
                        </span>
                      </div>
                    </button>

                    {/* Profile & Hierarchy */}
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <div>
                        <span>Employee Profile</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Designation, manager & employment IDs
                        </span>
                      </div>
                    </Link>

                    {/* Attendance Logs */}
                    <Link
                      to="/attendance"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition"
                    >
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Attendance & Punch Log</span>
                    </Link>

                    {/* Leave Applications */}
                    <Link
                      to="/requests"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition"
                    >
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>My Leave Requests</span>
                    </Link>
                  </div>

                  {/* Divider and Logout */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100 px-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        defaultTab={settingsDefaultTab}
      />
    </>
  );
};
