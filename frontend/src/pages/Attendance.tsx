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
  X,
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              <span>Time & Attendance Tracking</span>
              <span>•</span>
              <span className="text-slate-600 font-semibold">Audit & Timesheets</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Attendance Records
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Secure time tracking, automated absence classification, and monthly work hours.
            </p>
          </div>

          {/* Action Buttons: Month picker & Auto-classify */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-slate-800">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* HR / Admin Auto Classify Button */}
            {isHR && (
              <button
                onClick={() => setClassifyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Classify Absences</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Row: Employee filter (for managers) & Search */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Selector for Managers & Admins */}
            {isManager && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Employee:</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === pill.value
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
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
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-48 sm:w-60 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Monthly Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Days
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {summary.total_records}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Logged in period</span>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Present
            </span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">
              {summary.present_days}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">Full attendance</span>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Half Days
            </span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">
              {summary.half_days}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">Partial shifts</span>
          </div>

          <div className="bg-white rounded-2xl border border-sky-200 bg-sky-50/30 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-sky-800 uppercase tracking-wider">
              On Leave
            </span>
            <span className="text-2xl font-black text-sky-900 mt-1 block">
              {summary.on_leave_days}
            </span>
            <span className="text-[11px] text-sky-700 font-semibold">Approved leaves</span>
          </div>

          <div className="bg-white rounded-2xl border border-rose-200 bg-rose-50/30 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Absent
            </span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">
              {summary.absent_days}
            </span>
            <span className="text-[11px] text-rose-700 font-semibold">Unrecorded absence</span>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4 shadow-2xs">
            <span className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Total Hours
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">
              {summary.total_work_hours}
            </span>
            <span className="text-[11px] text-indigo-700 font-semibold">
              Avg {summary.avg_work_hours_per_present_day}h / day
            </span>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">Attendance Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {records.length} records
            </span>
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center space-y-3">
            <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Loading attendance data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No attendance records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no attendance records matching your selected month and filters. Check in
              above to create your record for today.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
                      className="hover:bg-slate-50/70 transition duration-150"
                    >
                      {/* Date Column */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rec.date}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {dayName}
                          </span>
                        </div>
                      </td>

                      {/* Employee Column */}
                      <td className="py-3 px-5">
                        <div>
                          <p className="font-bold text-slate-900">{rec.employee_name}</p>
                          <span className="text-[10px] text-slate-400">
                            {rec.employee_code || rec.employee_email} • {rec.department_name || 'Engineering'}
                          </span>
                        </div>
                      </td>

                      {/* Check In Column */}
                      <td className="py-3 px-5 font-mono text-slate-700 whitespace-nowrap">
                        {checkInTime}
                      </td>

                      {/* Check Out Column */}
                      <td className="py-3 px-5 font-mono text-slate-700 whitespace-nowrap">
                        {checkOutTime}
                      </td>

                      {/* Work Hours Column */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {rec.work_duration_hours} hrs
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-5 whitespace-nowrap">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Auto-Classify Attendance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Processes rules for active employees without check-in.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClassifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900">Predefined Rule Engine:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>If date is Company Holiday → Marked as <strong>Holiday</strong></li>
                <li>If date is Weekend → Marked as <strong>Weekend</strong></li>
                <li>If employee has approved leave → Marked as <strong>On Leave</strong></li>
                <li>Otherwise → Automatically classified as <strong>Absent</strong></li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                Target Date to Process
              </label>
              <input
                type="date"
                value={classifyDate}
                onChange={(e) => setClassifyDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-white"
              />
            </div>

            {autoClassifyMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                {autoClassifyMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassifyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAutoClassify}
                disabled={autoClassifying}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition disabled:opacity-50 cursor-pointer"
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
