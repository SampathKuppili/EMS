import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  LogIn,
  LogOut,
  CalendarOff,
  Clock4,
  RefreshCw,
  Users,
  AlertCircle,
} from 'lucide-react';

interface AttendanceSummaryData {
  checkedInCount: number;
  checkedOutCount: number;
  onLeaveCount: number;
  halfDayCount: number;
  totalLogged: number;
}

interface HRAttendanceSummaryCardProps {
  initialStats?: {
    total_employees?: number;
    present_today?: number;
    on_leave_today?: number;
    active_checkins?: number;
  };
  onRefreshNeeded?: () => void;
}

export const HRAttendanceSummaryCard: React.FC<HRAttendanceSummaryCardProps> = ({
  initialStats,
}) => {
  const [data, setData] = useState<AttendanceSummaryData>({
    checkedInCount: initialStats?.present_today ?? initialStats?.active_checkins ?? 0,
    checkedOutCount: 0,
    onLeaveCount: initialStats?.on_leave_today ?? 0,
    halfDayCount: 0,
    totalLogged: initialStats?.present_today ?? 0,
  });
  const [loading, setLoading] = useState<boolean>(!initialStats);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayIso = `${y}-${m}-${d}`;

      // 1. Fetch today's attendance logs from /attendance/records/ (not /attendance/)
      // 2. Fetch approved leave requests to cross-verify leaves overlapping today
      const [attRes, leaveRes] = await Promise.allSettled([
        apiClient.get(`/attendance/records/?start_date=${todayIso}&end_date=${todayIso}`),
        apiClient.get('/leave/requests/?status=APPROVED'),
      ]);

      const attList: any[] =
        attRes.status === 'fulfilled' && Array.isArray(attRes.value.data?.results)
          ? attRes.value.data.results
          : (attRes.status === 'fulfilled' && Array.isArray(attRes.value.data) ? attRes.value.data : []);

      const leaveList: any[] =
        leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data?.results)
          ? leaveRes.value.data.results
          : (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data) ? leaveRes.value.data : []);

      if (attRes.status === 'rejected' && leaveRes.status === 'rejected') {
        throw new Error('Both attendance and leave API queries failed.');
      }

      // Check-in: records where check_in is not null
      const checkedIn = attList.filter((r) => r.check_in !== null).length;

      // Check-out: records where check_out is not null
      const checkedOut = attList.filter((r) => r.check_out !== null).length;

      // Half-day leave: records marked HALF_DAY in attendance, or half-day approved leave today
      const halfDayAtt = attList.filter((r) => r.status === 'HALF_DAY').length;
      const halfDayLeaves = leaveList.filter((l) => {
        return l.is_half_day && todayIso >= l.start_date && todayIso <= l.end_date;
      }).length;
      const halfDayCount = Math.max(halfDayAtt, halfDayLeaves);

      // On leave today: attendance status ON_LEAVE / UNPAID_LEAVE or full-day approved leaves today
      const fullDayLeaves = leaveList.filter((l) => {
        return !l.is_half_day && todayIso >= l.start_date && todayIso <= l.end_date;
      }).length;
      const onLeaveAtt = attList.filter((r) => r.status === 'ON_LEAVE' || r.status === 'UNPAID_LEAVE').length;
      const onLeaveCount = Math.max(onLeaveAtt, fullDayLeaves);

      setData({
        checkedInCount: checkedIn,
        checkedOutCount: checkedOut,
        onLeaveCount,
        halfDayCount,
        totalLogged: attList.length,
      });
    } catch (err: any) {
      console.error('Failed to load today attendance summary', err);
      if (!initialStats) {
        setError('Unable to load attendance summary for today.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();

    const handleUpdate = () => {
      fetchAttendanceSummary();
    };
    window.addEventListener('attendance-updated', handleUpdate);
    return () => window.removeEventListener('attendance-updated', handleUpdate);
  }, []);

  // Update data if initialStats changes from parent
  useEffect(() => {
    if (initialStats) {
      setData((prev) => ({
        ...prev,
        checkedInCount: prev.checkedInCount || initialStats.present_today || initialStats.active_checkins || 0,
        onLeaveCount: prev.onLeaveCount || initialStats.on_leave_today || 0,
      }));
    }
  }, [initialStats]);

  const hasAnyData =
    data.checkedInCount > 0 ||
    data.checkedOutCount > 0 ||
    data.onLeaveCount > 0 ||
    data.halfDayCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Today's Attendance Summary
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Live operational turnup, active shifts, and absence distribution for today.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAttendanceSummary}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          title="Refresh attendance summary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading && !hasAnyData ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading today's attendance summary...</span>
        </div>
      ) : error && !hasAnyData ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAttendanceSummary}
            className="text-xs sm:text-sm font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : !hasAnyData ? (
        <div className="py-10 text-center text-slate-400">
          <Clock4 className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-bold text-slate-700">No data recorded for today</p>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Employees have not logged punches or leaves for this calendar date yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Tile 1: Checked In */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Checked In
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-1.5 block">
                {data.checkedInCount}
              </span>
              <span className="text-xs text-emerald-700 mt-1 block font-medium">
                Logged shifts today
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
          </div>

          {/* Tile 2: Checked Out */}
          <div className="bg-blue-50/60 border border-blue-100 p-5 rounded-2xl flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Checked Out
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-950 mt-1.5 block">
                {data.checkedOutCount}
              </span>
              <span className="text-xs text-blue-700 mt-1 block font-medium">
                Shift completed today
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
          </div>

          {/* Tile 3: On Leave */}
          <div className="bg-sky-50/60 border border-sky-100 p-5 rounded-2xl flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
                On Leave
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-sky-950 mt-1.5 block">
                {data.onLeaveCount}
              </span>
              <span className="text-xs text-sky-700 mt-1 block font-medium">
                Full-day approved time off
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <CalendarOff className="w-5 h-5" />
            </div>
          </div>

          {/* Tile 4: Half-Day Leave */}
          <div className="bg-amber-50/60 border border-amber-100 p-5 rounded-2xl flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Half-Day Leave
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-950 mt-1.5 block">
                {data.halfDayCount}
              </span>
              <span className="text-xs text-amber-700 mt-1 block font-medium">
                Partial session scheduled
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock4 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
