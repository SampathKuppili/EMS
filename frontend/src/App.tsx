import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { apiClient } from './api/client';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ApplyLeave } from './pages/ApplyLeave';
import { MyRequests } from './pages/MyRequests';
import { LeaveBalances } from './pages/LeaveBalances';
import { ManagerInbox } from './pages/ManagerInbox';
import { TeamCalendar } from './pages/TeamCalendar';
import { HRManagement } from './pages/HRManagement';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Attendance } from './pages/Attendance';
import { Reimbursements } from './pages/Reimbursements';
import { Documents } from './pages/Documents';
import { Payroll } from './pages/Payroll';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const refreshBadges = async () => {
    if (!user) return;
    try {
      const countRes = await apiClient.get('/notifications/unread-count/');
      setUnreadCount(countRes.data.unread_count || 0);

      if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        const pendingRes = await apiClient.get('/leave/requests/?status=PENDING');
        const count = (pendingRes.data.results || pendingRes.data).length;
        setPendingApprovalsCount(count);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sleek Collapsible Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        pendingApprovalsCount={pendingApprovalsCount}
        unreadNotificationsCount={unreadCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onToggleCollapse={handleToggleSidebarCollapse}
          isSidebarCollapsed={sidebarCollapsed}
          unreadCount={unreadCount}
          onRefreshNotifications={refreshBadges}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1720px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside Modern AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Attendance />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ApplyLeave />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MyRequests />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/balances"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <LeaveBalances />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reimbursements"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Reimbursements />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Documents />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Payroll />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                <AppLayout>
                  <ManagerInbox />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TeamCalendar />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER']}>
                <AppLayout>
                  <HRManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-types"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER']}>
                <AppLayout>
                  <HRManagement defaultTab="LEAVE_TYPES" />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Notifications />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
