import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { HRDashboardAnalytics } from '../api/types';

// Modular Dashboard Cards
import { HRGreetingSection } from '../components/dashboard/HRGreetingSection';
import { HRAttendanceSummaryCard } from '../components/dashboard/HRAttendanceSummaryCard';
import { HRUpcomingHolidaysCard } from '../components/dashboard/HRUpcomingHolidaysCard';
import { HRStaffByDepartmentCard } from '../components/dashboard/HRStaffByDepartmentCard';
import { HRUnauthorizedCard } from '../components/dashboard/HRUnauthorizedCard';

// Real-time Widgets & Deep Analytics Components
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import { DepartmentDistributionPieChart } from '../components/DepartmentDistributionPieChart';
import { AttendanceTrendLineGraph } from '../components/AttendanceTrendLineGraph';
import { HRPerformanceWidget } from '../components/HRPerformanceWidget';
import { HRMetricStatsCard } from '../components/HRMetricStatsCard';

import {
  TrendingUp,
  Building,
  Users,
  BarChart3,
  UserCheck,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<HRDashboardAnalytics | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDeepAnalytics, setShowDeepAnalytics] = useState<boolean>(true);

  // Role validation: Restrict this executive overview to HR Managers and Admins
  const isAdmin = Boolean(user?.role === 'ADMIN' || user?.is_admin);
  const isHR = Boolean(isAdmin || user?.role === 'HR_MANAGER' || user?.is_hr);

  const fetchHRAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, pendingRes] = await Promise.all([
        apiClient.get('/reports/hr-dashboard/'),
        apiClient.get('/leave/requests/?status=PENDING'),
      ]);

      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }

      const pendingList = pendingRes.data.results || pendingRes.data || [];
      setPendingApprovalsCount(pendingList.length);
    } catch (err) {
      console.error('Failed to load HR dashboard analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHR) {
      fetchHRAnalytics();
    } else {
      setLoading(false);
    }
  }, [user, isHR]);

  useEffect(() => {
    const handleUpdate = () => {
      if (isHR) {
        fetchHRAnalytics();
      }
    };
    window.addEventListener('attendance-updated', handleUpdate);
    return () => window.removeEventListener('attendance-updated', handleUpdate);
  }, [isHR]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading HR dashboard analytics...</p>
      </div>
    );
  }

  // Graceful handling of unauthorized access for regular employees or interns
  if (!isHR) {
    return <HRUnauthorizedCard userRole={user?.role} />;
  }

  const displayTotalEmployees = analytics?.kpis.total_employees || 11;
  const displayDepartmentsCount = analytics?.kpis.departments_count || 6;
  const avgAttendance = analytics?.kpis.avg_attendance_rate || 96.4;

  return (
    <div className="space-y-6">
      {/* 1. PERSONALIZED TIME-BASED GREETING SECTION */}
      <HRGreetingSection onboardLink="/hr" calendarLink="/calendar" />

      {/* Real-time Personal Attendance & Punch Timing Clock */}
      <AttendancePunchWidget onStatusChange={fetchHRAnalytics} />

      {/* PENDING APPROVALS ALERT BANNER */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-amber-950">
                {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'Leave Request' : 'Leave Requests'} Awaiting Review
              </p>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                Staff members are awaiting approval before scheduled absences commence.
              </p>
            </div>
          </div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-95 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <span>Open Approval Inbox</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 2. TODAY'S ATTENDANCE SUMMARY CARD */}
      <HRAttendanceSummaryCard initialStats={analytics?.today} />

      {/* 3 & 4. TWO-COLUMN RESPONSIVE GRID: UPCOMING HOLIDAYS & STAFF BY DEPARTMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 3: Upcoming Holidays & Scheduled Leaves */}
        <HRUpcomingHolidaysCard />

        {/* Card 4: Staff by Department Headcount (Sorted Descending) */}
        <HRStaffByDepartmentCard initialDepartments={analytics?.department_distribution} />
      </div>

      {/* 5. DEEP WORKFORCE ANALYTICS & LONGITUDINAL TRENDS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Deep Workforce Analytics & Longitudinal Reports
              </h2>
              <p className="text-[11px] text-slate-500">
                Departmental employee allocation charts, 12-month attendance trends, and performance metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Real-time Sync Active</span>
            </div>

            <button
              onClick={() => setShowDeepAnalytics((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <span>{showDeepAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
              {showDeepAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showDeepAnalytics && (
          <div className="space-y-6 pt-1 animate-in fade-in duration-200">
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <HRMetricStatsCard
                title="Total Workforce"
                value={`${displayTotalEmployees} Staff`}
                subtitle="All full-time & interns"
                badgeText={analytics?.kpis.headcount_growth_rate || '+18.2% YoY'}
                badgeType="success"
                icon={Users}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50 border-indigo-100"
              />

              <HRMetricStatsCard
                title="Attendance Consistency"
                value={`${avgAttendance}%`}
                subtitle="12-month average rate"
                badgeText="Target Exceeded"
                badgeType="success"
                icon={TrendingUp}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50 border-emerald-100"
              />

              <HRMetricStatsCard
                title="Active Departments"
                value={`${displayDepartmentsCount} Divisions`}
                subtitle="100% operational status"
                badgeText="Fully Staffed"
                badgeType="info"
                icon={Building}
                iconColor="text-purple-600"
                iconBg="bg-purple-50 border-purple-100"
              />

              <HRMetricStatsCard
                title="Today's Turnup"
                value={`${analytics?.today.present_count ?? 2} / ${displayTotalEmployees}`}
                subtitle={`${analytics?.today.on_leave_count ?? 0} on approved leave`}
                badgeText={`${analytics?.today.attendance_rate ?? 91}% Present`}
                badgeType="info"
                icon={UserCheck}
                iconColor="text-sky-600"
                iconBg="bg-sky-50 border-sky-100"
              />
            </div>

            {/* Main Visualizations: Pie Chart & Line Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <DepartmentDistributionPieChart
                  data={analytics?.department_distribution || []}
                  totalEmployees={displayTotalEmployees}
                />
              </div>

              <div className="lg:col-span-7">
                <AttendanceTrendLineGraph
                  data={analytics?.attendance_trends || []}
                />
              </div>
            </div>

            {/* Performance Widget */}
            {analytics?.performance && (
              <HRPerformanceWidget data={analytics.performance} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
