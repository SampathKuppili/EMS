import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { TodayAttendanceStatus } from '../api/types';
import { AttendanceBadge } from './AttendanceBadge';
import {
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Timer,
  ArrowRight,
  MessageSquare,
  Clock,
  X,
  Briefcase,
  Check,
} from 'lucide-react';

interface AttendancePunchWidgetProps {
  onStatusChange?: () => void;
}

export const AttendancePunchWidget: React.FC<AttendancePunchWidgetProps> = ({ onStatusChange }) => {
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Note dialog / input state
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Live clock state
  const [timeParts, setTimeParts] = useState<{ time: string; ampm: string; date: string }>({
    time: '--:--:--',
    ampm: '',
    date: '',
  });

  // Elapsed active work timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const PRESET_NOTES = ['Remote / WFH', 'Office Regular', 'Client Visit', 'Half Day Shift'];

  // Fetch today's status
  const fetchStatus = async () => {
    try {
      const res = await apiClient.get<TodayAttendanceStatus>('/attendance/today/');
      setTodayStatus(res.data);
      if (res.data.record && res.data.record.is_checked_in) {
        setElapsedSeconds(res.data.elapsed_seconds || 0);
      }
      setErrorMsg('');
    } catch (err: any) {
      console.error('Failed to fetch attendance status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen for global attendance changes (e.g. punches initiated from header navbar)
    const handleAttendanceUpdate = () => {
      fetchStatus();
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdate);
    };
  }, []);

  // Update current live digital clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const rawTime = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const match = rawTime.match(/(.*?)\s*(AM|PM|am|pm)$/i);
      if (match) {
        setTimeParts({
          time: match[1],
          ampm: match[2].toUpperCase(),
          date: now.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        });
      } else {
        setTimeParts({
          time: rawTime,
          ampm: '',
          date: now.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        });
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Increment active work timer if checked in
  useEffect(() => {
    if (!todayStatus?.record?.is_checked_in) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayStatus?.record?.is_checked_in]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/attendance/check-in/', { notes });
      const checkInTime = res.data.record?.check_in
        ? new Date(res.data.record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      setSuccessMsg(
        checkInTime
          ? `Successfully checked in at ${checkInTime}. Have a productive day!`
          : res.data.message || 'Successfully checked in!'
      );
      setShowNotesInput(false);
      setNotes('');
      await fetchStatus();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.check_in?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Check-in failed. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you sure you want to check out for today?')) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/attendance/check-out/', { notes });
      const checkOutTime = res.data.record?.check_out
        ? new Date(res.data.record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      setSuccessMsg(
        checkOutTime
          ? `Successfully checked out at ${checkOutTime}. Great work today!`
          : res.data.message || 'Successfully checked out!'
      );
      setShowNotesInput(false);
      setNotes('');
      await fetchStatus();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.check_out?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Check-out failed. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-5 bg-slate-100 rounded-full w-20"></div>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const isCheckedIn = !!todayStatus?.record?.is_checked_in;
  const isCompleted = !!todayStatus?.record?.is_completed;
  const canCheckIn = !!todayStatus?.can_check_in;
  const canCheckOut = !!todayStatus?.can_check_out;

  const formattedCheckInTime = todayStatus?.record?.check_in
    ? new Date(todayStatus.record.check_in).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const formattedCheckOutTime = todayStatus?.record?.check_out
    ? new Date(todayStatus.record.check_out).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Breakdown elapsed time
  const hrs = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const targetSeconds = 8 * 3600; // Standard 8-hour workday
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200">
      {/* Subtle top indicator bar */}
      <div
        className={`h-1 w-full ${
          isCheckedIn
            ? 'bg-emerald-500'
            : isCompleted
            ? 'bg-indigo-500'
            : 'bg-slate-200'
        }`}
      />

      <div className="p-4 sm:p-5">
        {/* Main Flex Row: Clock & Status | Duration Tracker | Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* SECTION 1: Clock & Live Time */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/70">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {timeParts.time}
                </span>
                {timeParts.ampm && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                    {timeParts.ampm}
                  </span>
                )}
                <div className="ml-1">
                  {todayStatus && (
                    <AttendanceBadge
                      status={
                        todayStatus.record?.status ||
                        (isCheckedIn
                          ? 'PRESENT'
                          : isCompleted
                          ? todayStatus.record?.status || 'PRESENT'
                          : todayStatus.is_holiday
                          ? 'HOLIDAY'
                          : todayStatus.is_weekend
                          ? 'WEEKEND'
                          : todayStatus.is_on_leave
                          ? 'ON_LEAVE'
                          : 'NOT_CHECKED_IN')
                      }
                      size="sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-medium text-slate-600">{timeParts.date}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  <span>Shift: 09:00 - 18:00</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Work Duration & Progress Tracker */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-2.5">
            {isCheckedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Active Shift
                    </span>
                  </div>
                  <span className="font-mono text-lg font-black text-slate-900 mt-0.5">
                    {hrs.toString().padStart(2, '0')}:{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="w-24 sm:w-28 flex flex-col gap-1 border-l border-slate-200 pl-3">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>8h Target</span>
                    <span className="font-bold text-slate-700">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : isCompleted ? (
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Duration Logged
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {todayStatus?.record?.work_duration_hours || '0.00'} hrs completed
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Timer className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Work Duration
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Standby • 8h standard target
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Action Buttons & History */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            {/* CHECK IN BUTTON */}
            {canCheckIn && !isCheckedIn && !isCompleted && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Check In Now</span>
                  </>
                )}
              </button>
            )}

            {/* CHECK OUT BUTTON */}
            {canCheckOut && isCheckedIn && (
              <button
                id="widget-checkout-btn"
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition shadow-xs ring-2 ring-rose-200 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Check Out Now</span>
                  </>
                )}
              </button>
            )}

            {/* COMPLETED PILL */}
            {isCompleted && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shift Completed</span>
              </div>
            )}

            {/* NOTES TOGGLE */}
            {(!isCompleted || isCheckedIn) && (
              <button
                type="button"
                onClick={() => setShowNotesInput(!showNotesInput)}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center relative cursor-pointer ${
                  showNotesInput || notes
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                title={showNotesInput ? 'Hide notes' : 'Add punch notes'}
              >
                <MessageSquare className="w-4 h-4" />
                {notes && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-1 right-1 ring-2 ring-white" />
                )}
              </button>
            )}

            {/* HISTORY LINK */}
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
              title="View full attendance history"
            >
              <span>History</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* COLLAPSIBLE QUICK NOTES DRAWER */}
        {showNotesInput && (
          <div className="mt-3 pt-3 border-t border-slate-100 p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Optional Shift Note</span>
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Remote work, client visit, sprint tickets..."
              className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              autoFocus
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-medium">Quick tags:</span>
              {PRESET_NOTES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNotes(tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    notes === tag
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM METADATA STRIP: Punch In, Punch Out, Shift Status */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-y-2">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Punch In:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formattedCheckInTime || '--:--'}
              </span>
            </span>

            <span className="text-slate-200 hidden sm:inline">|</span>

            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Punch Out:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formattedCheckOutTime || '--:--'}
              </span>
            </span>

            <span className="text-slate-200 hidden sm:inline">|</span>

            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Status:</span>
              <span className="font-medium text-slate-800">
                {isCheckedIn ? (
                  <span className="text-emerald-700 font-bold">Active / On Duty</span>
                ) : isCompleted ? (
                  <span className="text-blue-700 font-bold">Shift Completed</span>
                ) : (
                  'Ready to Check In'
                )}
              </span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {todayStatus?.is_holiday ? (
              <span className="text-purple-700 font-semibold">Holiday: {todayStatus.holiday_name}</span>
            ) : todayStatus?.is_weekend ? (
              <span>Weekend Scheduled Off</span>
            ) : todayStatus?.is_on_leave ? (
              <span className="text-blue-700 font-semibold">On Leave: {todayStatus.leave_name}</span>
            ) : (
              <span>Location & IP verified automatically</span>
            )}
          </div>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
