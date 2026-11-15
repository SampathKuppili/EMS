import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { AttendanceRecord, AttendanceSummary, User } from '../api/types';
import { AttendanceBadge } from '../components/AttendanceBadge';
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import {
  Clock,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();

  // Selection states
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoClassifying, setAutoClassifying] = useState<boolean>(false);
  const [autoClassifyMsg, setAutoClassifyMsg] = useState<string>('');
  const [classifyModalOpen, setClassifyModalOpen] = useState<boolean>(false);
  const [classifyDate, setClassifyDate] = useState<string>(
    new Date(Date.now() - 86400000).toISOString().split('T')[0]
  );

  const isAdmin = user?.role === 'ADMIN' || user?.is_admin;
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || Boolean(user?.is_hr);
  const isManager = user?.role === 'MANAGER' || isHR;

  // Load employee list for managers / HR
  useEffect(() => {
    if (isManager) {
      const fetchEmployees = async () => {
        try {
          const res = await apiClient.get('/users/');
          setEmployees(res.data.results || res.data || []);
        } catch (err) {
          console.error('Failed to load employees for attendance filter', err);
        }
      };
      fetchEmployees();
    }
  }, [isManager]);

  // Fetch Attendance Records and Summary
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        year: selectedYear,
        month: selectedMonth,
      };

      if (selectedEmployeeId) {
        params.employee = selectedEmployeeId;
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Summary query
      const summaryParams: Record<string, any> = {
        year: selectedYear,
        month: selectedMonth,
      };
      if (selectedEmployeeId) {
        summaryParams.employee = selectedEmployeeId;
      }

      const [recordsRes, summaryRes] = await Promise.all([
        apiClient.get('/attendance/records/', { params }),
        apiClient.get('/attendance/summary/', { params: summaryParams }),
      ]);

      setRecords(recordsRes.data.results || recordsRes.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, selectedEmployeeId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Run auto-classification
  const handleAutoClassify = async () => {
    setAutoClassifying(true);
    setAutoClassifyMsg('');
    try {
      const res = await apiClient.post('/attendance/auto-classify/', {
        date: classifyDate,
      });
      setAutoClassifyMsg(res.data.message || 'Auto-classification complete!');
      await fetchData();
      setTimeout(() => {
        setClassifyModalOpen(false);
        setAutoClassifyMsg('');
      }, 2000);
    } catch (err: any) {
      setAutoClassifyMsg(
        err.response?.data?.message || err.response?.data?.detail || 'Classification failed.'
      );
    } finally {
      setAutoClassifying(false);
    }
  };

  // Export records to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Date',
      'Employee Code',
      'Employee Name',
      'Department',
      'Check In',
      'Check Out',
      'Work Duration (Hours)',
      'Status',
      'Notes',
    ];

    const rows = records.map((r) => [
      r.date,
      r.employee_code || '',
      `"${r.employee_name}"`,
      `"${r.department_name || ''}"`,
      r.check_in ? new Date(r.check_in).toLocaleTimeString() : '',
      r.check_out ? new Date(r.check_out).toLocaleTimeString() : '',
      r.work_duration_hours,
      r.status,
      `"${r.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Attendance_Report_${selectedYear}_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="space-y-6">
      {/* Top Punch Widget for Instant Check-in & Timer */}
      <AttendancePunchWidget onStatusChange={fetchData} />

      {/* Main Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              <span>Time & Attendance Tracking</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">Audit & Reports</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Attendance Timesheets
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Secure time tracking, automated absence classification, and monthly work hours.
            </p>
          </div>

          {/* Action Buttons: Month picker & Auto-classify */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-semibold text-slate-800">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* HR / Admin Auto Classify Button */}
            {isHR && (
              <button
                onClick={() => setClassifyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Classify Absences</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Row: Employee filter (for managers) & Search */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Selector for Managers & Admins */}
            {isManager && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Employee:</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">All Team Members</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.profile?.employee_code || emp.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Present', value: 'PRESENT' },
                { label: 'Half Day', value: 'HALF_DAY' },
                { label: 'On Leave', value: 'ON_LEAVE' },
                { label: 'Absent', value: 'ABSENT' },
                { label: 'Holiday', value: 'HOLIDAY' },
                { label: 'Weekend', value: 'WEEKEND' },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setStatusFilter(pill.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${statusFilter === pill.value
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee or code..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 w-48 sm:w-60"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Monthly Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Days
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {summary.total_records}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Logged in period</span>
          </div>

          <div className="bg-white rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Present
            </span>
            <span className="text-2xl font-bold text-emerald-800 mt-1 block">
              {summary.present_days}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Full attendance</span>
          </div>

          <div className="bg-white rounded-xl border border-amber-100 bg-amber-50/20 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Half Days
            </span>
            <span className="text-2xl font-bold text-amber-800 mt-1 block">
              {summary.half_days}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Partial shifts</span>
          </div>

          <div className="bg-white rounded-xl border border-blue-100 bg-blue-50/20 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              On Leave
            </span>
            <span className="text-2xl font-bold text-blue-800 mt-1 block">
              {summary.on_leave_days}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Approved leaves</span>
          </div>

          <div className="bg-white rounded-xl border border-rose-100 bg-rose-50/20 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              Absent
            </span>
            <span className="text-2xl font-bold text-rose-800 mt-1 block">
              {summary.absent_days}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">Unrecorded absence</span>
          </div>

          <div className="bg-white rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 shadow-2xs">
            <span className="block text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Total Hours
            </span>
            <span className="text-2xl font-bold text-indigo-800 mt-1 block">
              {summary.total_work_hours}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">
              Avg {summary.avg_work_hours_per_present_day}h / day
            </span>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">Attendance Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {records.length} records
            </span>
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No attendance records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no attendance records matching your selected month and filters. Check in
              above to create your record for today.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Check In</th>
                  <th className="py-3 px-5">Check Out</th>
                  <th className="py-3 px-5">Work Hours</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Notes & Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const checkInTime = rec.check_in
                    ? new Date(rec.check_in).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : '—';

                  const checkOutTime = rec.check_out
                    ? new Date(rec.check_out).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : '—';

                  const recordDate = new Date(`${rec.date}T00:00:00`);
                  const dayName = recordDate.toLocaleDateString(undefined, { weekday: 'short' });

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/60 transition duration-150 group"
                    >
                      {/* Date Column */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{rec.date}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {dayName}
                          </span>
                        </div>
                      </td>

                      {/* Employee Column */}
                      <td className="py-3 px-5">
                        <div>
                          <p className="font-semibold text-slate-900">{rec.employee_name}</p>
                          <span className="text-[10px] text-slate-400">
                            {rec.employee_code || rec.employee_email} • {rec.department_name || 'Engineering'}
                          </span>
                        </div>
                      </td>

                      {/* Check In Column */}
                      <td className="py-3 px-5 font-mono text-slate-700">
                        {checkInTime}
                      </td>

                      {/* Check Out Column */}
                      <td className="py-3 px-5 font-mono text-slate-700">
                        {checkOutTime}
                      </td>

                      {/* Work Hours Column */}
                      <td className="py-3 px-5">
                        <span className="font-semibold text-slate-900">
                          {rec.work_duration_hours} hrs
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-5">
                        <AttendanceBadge status={rec.status} />
                      </td>

                      {/* Notes Column */}
                      <td className="py-3 px-5 text-slate-500 max-w-xs truncate" title={rec.notes}>
                        {rec.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto Classify Modal for HR & Admins */}
      {classifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Auto-Classify Attendance
                </h3>
                <p className="text-xs text-slate-500">
                  Processes rules for all active employees without check-in.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <p className="font-semibold text-slate-800">Predefined Rule Engine:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                <li>If date is Company Holiday $\to$ Marked <strong>Holiday</strong></li>
                <li>If date is Weekend $\to$ Marked <strong>Weekend</strong></li>
                <li>If employee has approved leave $\to$ Marked <strong>On Leave</strong></li>
                <li>Otherwise $\to$ Automatically classified as <strong>Absent</strong></li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Date to Process
              </label>
              <input
                type="date"
                value={classifyDate}
                onChange={(e) => setClassifyDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {autoClassifyMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                {autoClassifyMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClassifyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAutoClassify}
                disabled={autoClassifying}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{autoClassifying ? 'Processing...' : 'Run Classification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Attendance;
