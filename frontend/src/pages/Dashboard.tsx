import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  LeaveBalance,
  LeaveRequest,
  Holiday,
  Department,
  HRDashboardAnalytics,
} from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import { DepartmentDistributionPieChart } from '../components/DepartmentDistributionPieChart';
import { AttendanceTrendLineGraph } from '../components/AttendanceTrendLineGraph';
import { HRPerformanceWidget } from '../components/HRPerformanceWidget';
import { HRMetricStatsCard } from '../components/HRMetricStatsCard';
import {
  CalendarPlus,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Building,
  Users,
  UserPlus,
  GraduationCap,
  Sparkles,
  BookOpen,
  CalendarDays,
  BarChart3,
  UserCheck,
  Activity,
  ChevronRight,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalEmployeesCount, setTotalEmployeesCount] = useState<number>(0);
  const [analytics, setAnalytics] = useState<HRDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isAdmin = user?.role === 'ADMIN' || user?.is_admin;
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || user?.is_hr;
  const isIntern = user?.role === 'INTERN' || user?.is_intern;
  const isManager = user?.role === 'MANAGER' || isHR;

  // View state: HR Managers & Admins default to HR Analytics; employees can toggle between both
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'WORKSPACE'>(
    isHR || isManager ? 'ANALYTICS' : 'WORKSPACE'
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const promises: Promise<any>[] = [
          apiClient.get('/leave/balance/'),
          apiClient.get('/leave/requests/?limit=5'),
          apiClient.get('/holidays/'),
          apiClient.get('/reports/hr-dashboard/'),
        ];

        if (isHR) {
          promises.push(apiClient.get('/departments/'));
          promises.push(apiClient.get('/users/'));
        }

        const [balRes, reqRes, holRes, analyticsRes, deptRes, usersRes] = await Promise.all(promises);

        setBalances(balRes.data.results || balRes.data || []);
        setRecentRequests(reqRes.data.results || reqRes.data || []);
        setUpcomingHolidays(holRes.data.results || holRes.data || []);

        if (analyticsRes?.data) {
          setAnalytics(analyticsRes.data);
        }

        if (deptRes) {
          setDepartments(deptRes.data.results || deptRes.data || []);
        }
        if (usersRes) {
          const list = usersRes.data.results || usersRes.data || [];
          setTotalEmployeesCount(list.length);
        }

        if (isManager) {
          const pendingRes = await apiClient.get('/leave/requests/?status=PENDING');
          const count = (pendingRes.data.results || pendingRes.data || []).length;
          setPendingApprovalsCount(count);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isHR, isManager]);

  const refreshHRAnalytics = async () => {
    try {
      const res = await apiClient.get('/reports/hr-dashboard/');
      if (res?.data) {
        setAnalytics(res.data);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      refreshHRAnalytics();
    };
    window.addEventListener('attendance-updated', handleUpdate);
    return () => window.removeEventListener('attendance-updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading HR dashboard analytics...</p>
      </div>
    );
  }

  const totalRemainingDays = balances.reduce(
    (sum, b) => sum + parseFloat(b.remaining_days || '0'),
    0
  );
  const totalAllocatedDays = balances.reduce(
    (sum, b) => sum + parseFloat(b.allocated_days || '0'),
    0
  );
  const totalCarriedForwardDays = balances.reduce(
    (sum, b) => sum + parseFloat(b.carried_forward_days || '0'),
    0
  );
  const totalCombinedDays = totalAllocatedDays + totalCarriedForwardDays;
  const totalUsedDays = balances.reduce(
    (sum, b) => sum + parseFloat(b.used_days || '0'),
    0
  );

  const displayTotalEmployees = analytics?.kpis.total_employees || totalEmployeesCount || 11;
  const displayDepartmentsCount = analytics?.kpis.departments_count || departments.length || 6;
  const avgAttendance = analytics?.kpis.avg_attendance_rate || 96.4;

  return (
    <div className="space-y-6">
      {/* 1. ROLE-SPECIFIC HERO HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">
              {isAdmin
                ? 'System Administration & Global Directory'
                : isHR
                  ? 'People Operations & Workforce Analytics'
                  : isManager
                    ? 'Engineering Leadership & Approvals'
                    : isIntern
                      ? 'Engineering Internship Program'
                      : user?.profile?.department_name || 'Software Engineering'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Welcome, {user?.first_name || user?.full_name}</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : user?.role === 'HR_MANAGER'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : isIntern
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : isManager
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {user?.role === 'HR_MANAGER'
                ? 'HR Operations Lead'
                : user?.role === 'ADMIN'
                  ? 'System Administrator'
                  : user?.role === 'INTERN'
                    ? 'Engineering Intern'
                    : user?.role === 'MANAGER'
                      ? 'Team Lead & Manager'
                      : 'Software Engineer'}
            </span>
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {isHR ? (
              <>
                Monitoring <strong className="text-slate-800">{displayTotalEmployees} active team members</strong> across{' '}
                <strong className="text-slate-800">{displayDepartmentsCount} operating divisions</strong>. Attendance tracking, headcount allocation, and quarterly performance metrics are active.
              </>
            ) : isManager ? (
              <>
                Leading team operations with <strong className="text-slate-800">{avgAttendance}% annual attendance</strong>. Review team requests and track sprint delivery scores below.
              </>
            ) : (
              <>
                You have <strong className="text-slate-800 font-semibold">{totalRemainingDays} days</strong> available for {new Date().getFullYear()}
                {totalCarriedForwardDays > 0 && (
                  <span className="text-indigo-600 font-medium ml-1">
                    (including {totalCarriedForwardDays} carried over)
                  </span>
                )}.
              </>
            )}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
          {isHR ? (
            <Link
              to="/hr"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Staff</span>
            </Link>
          ) : (
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Request Leave</span>
            </Link>
          )}

          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Calendar</span>
          </Link>
        </div>
      </div>

      {/* Real-time Attendance & Punch Timing Card with Check In & Check Out */}
      <AttendancePunchWidget onStatusChange={refreshHRAnalytics} />

      {/* 2. DASHBOARD VIEW SELECTOR TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'ANALYTICS'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>HR Analytics & Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('WORKSPACE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'WORKSPACE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-600" />
            <span>My Time & Attendance</span>
            {pendingApprovalsCount > 0 && isManager && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Real-time Sync Active</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">Database v2.4</span>
        </div>
      </div>

      {/* PENDING APPROVALS ALERT BANNER */}
      {isManager && pendingApprovalsCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'Leave Request' : 'Leave Requests'} Awaiting Review
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Team members are waiting for your approval before taking scheduled absences.
              </p>
            </div>
          </div>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition self-start sm:self-auto shrink-0"
          >
            <span>Open Approval Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* =========================================================================
          TAB 1: HR EXECUTIVE ANALYTICS VIEW
          ========================================================================= */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Key KPI Stats Grid */}
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
              title="Today's Operational Turnup"
              value={`${analytics?.today.present_count ?? 10} / ${displayTotalEmployees}`}
              subtitle={`${analytics?.today.on_leave_count ?? 1} on approved leave`}
              badgeText={`${analytics?.today.attendance_rate ?? 91}% Present`}
              badgeType="info"
              icon={UserCheck}
              iconColor="text-sky-600"
              iconBg="bg-sky-50 border-sky-100"
            />
          </div>

          {/* MAIN VISUALIZATIONS SECTION: PIE CHART & LINE GRAPH */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PIE CHART: Department Employee Distribution */}
            <div className="lg:col-span-5">
              <DepartmentDistributionPieChart
                data={analytics?.department_distribution || []}
                totalEmployees={displayTotalEmployees}
              />
            </div>

            {/* LINE GRAPH: Attendance Tracking Over Last Year */}
            <div className="lg:col-span-7">
              <AttendanceTrendLineGraph
                data={analytics?.attendance_trends || []}
              />
            </div>
          </div>

          {/* PERFORMANCE & PRODUCTIVITY OVERVIEW */}
          {analytics?.performance && (
            <HRPerformanceWidget data={analytics.performance} />
          )}

          {/* SECONDARY ROW: Department Directory & Upcoming Holidays */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Directory Quick Cards */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Department Directory & Allocations</h3>
                </div>
                {isHR && (
                  <Link
                    to="/hr"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <span>Manage All</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(analytics?.department_distribution || []).map((d) => (
                  <div
                    key={d.id || d.name}
                    className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{d.description}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                      {d.count} staff
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Corporate Holidays */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Corporate Holidays Calendar</h3>
                </div>
                <Link
                  to="/calendar"
                  className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                >
                  <span>Full Calendar</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {upcomingHolidays.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-purple-50/30 border border-purple-100/80 rounded-xl flex items-center justify-between hover:bg-purple-50/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold flex flex-col items-center justify-center text-[10px] shrink-0">
                        <span>{new Date(h.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="leading-none text-xs">{new Date(h.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{h.name}</p>
                        <p className="text-[11px] text-slate-400">{h.description || 'Public company holiday'}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-100">
                      {h.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MY TIME, PUNCH & PERSONAL WORKSPACE VIEW
          ========================================================================= */}
      {activeTab === 'WORKSPACE' && (
        <div className="space-y-6">
          {/* Intern Mentorship Highlight Card */}
          {isIntern && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Internship Mentor
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {user?.profile?.manager_name || 'David Miller (Engineering Manager)'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Direct guidance & time-off approvals
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Intern Time-Off Quota
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {totalRemainingDays} days remaining
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Casual & Medical leave eligible
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Exam Flexibility
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    Academic Exam Support
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Coordinate dates with your mentor
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Available
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-bold text-slate-900 mt-2 block tracking-tight">
                {totalRemainingDays} <span className="text-xs font-normal text-slate-500">days</span>
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {totalCarriedForwardDays > 0 ? (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md">
                    +{totalCarriedForwardDays} carried over
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Regular balance quota</span>
                )}
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Annual Quota
                </span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 mt-2 block tracking-tight">
                {totalCombinedDays} <span className="text-xs font-normal text-slate-500">days</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {totalAllocatedDays} fresh + {totalCarriedForwardDays} carried
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Days Consumed
                </span>
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-bold text-slate-900 mt-2 block tracking-tight">
                {totalUsedDays} <span className="text-xs font-normal text-slate-500">days</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Approved absences</span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pending Requests
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-amber-600 mt-2 block tracking-tight">
                {recentRequests.filter((r) => r.status === 'PENDING').length}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Awaiting review</span>
            </div>
          </div>

          {/* Recent Applications & Balances Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Leave Applications</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Latest status of submitted time-off requests
                  </p>
                </div>
                <Link
                  to="/requests"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          No recent leave requests submitted yet.
                        </td>
                      </tr>
                    ) : (
                      recentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {req.leave_type.name}
                            {req.is_half_day && (
                              <span className="ml-1.5 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                                Half-day
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            {req.start_date === req.end_date
                              ? req.start_date
                              : `${req.start_date} → ${req.end_date}`}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {req.duration_days} {Number(req.duration_days) === 1 ? 'day' : 'days'}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <StatusBadge status={req.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Balance Bars */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Leave Quotas & Balances</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Annual allowances & carry-forward
                  </p>
                </div>
                <Link
                  to="/balances"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Details →
                </Link>
              </div>

              <div className="space-y-3">
                {balances.map((b) => {
                  const total = parseFloat(b.total_allocated_days || b.allocated_days || '0');
                  const used = parseFloat(b.used_days || '0');
                  const carried = parseFloat(b.carried_forward_days || '0');
                  const remaining = parseFloat(b.remaining_days || '0');
                  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

                  return (
                    <div key={b.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{b.leave_type_name}</span>
                          {carried > 0 && (
                            <span className="ml-1.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                              +{carried} carried over
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {remaining} <span className="font-normal text-slate-500">left of {total}</span>
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
