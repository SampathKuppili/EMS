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
  Calendar,
  Sparkles,
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
            weekday: 'long',
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
            weekday: 'long',
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
          ? `Successfully checked in at ${checkInTime}. Have a productive session!`
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-slate-200 rounded-lg w-1/4"></div>
          <div className="h-6 bg-slate-100 rounded-full w-24"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-slate-100 rounded-xl"></div>
          <div className="h-24 bg-slate-100 rounded-xl"></div>
        </div>
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200">
      {/* Top Banner Accent Strip */}
      <div
        className={`h-1.5 w-full ${
          isCheckedIn
            ? 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 animate-pulse'
            : isCompleted
            ? 'bg-linear-to-r from-blue-500 via-indigo-500 to-indigo-600'
            : 'bg-linear-to-r from-slate-200 via-indigo-300 to-slate-200'
        }`}
      />

      <div className="p-5 sm:p-6">
        {/* Card Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Daily Attendance & Punch
                </span>
                <span className="text-slate-300">•</span>
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
                  />
                )}
              </div>
            </div>

            {isCheckedIn && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Shift
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 font-medium">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift: <strong>09:00 - 18:00</strong></span>
            </span>

            <Link
              to="/attendance"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition border border-slate-200/80"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Main Grid: Clock & Context (Left) + Work Duration KPI & Actions (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* =========================================================================
              LEFT COLUMN: DIGITAL PUNCH CLOCK & DATE (5 COLS)
              ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <span>Current Time</span>
                <span className="text-slate-400 font-mono">Live Clock</span>
              </div>

              {/* Digital Time & AM/PM Badge */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-slate-900 drop-shadow-2xs">
                  {timeParts.time}
                </span>
                {timeParts.ampm && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs tracking-wide">
                    {timeParts.ampm}
                  </span>
                )}
              </div>

              {/* Formatted Date */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{timeParts.date}</span>
              </div>
            </div>

            {/* Context Status Pill */}
            <div className="mt-4 pt-3 border-t border-slate-200/70">
              {isCheckedIn && formattedCheckInTime && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Checked in today at{' '}
                    <strong className="font-bold text-slate-900">{formattedCheckInTime}</strong>
                  </span>
                </div>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Shift Completed: In <strong className="text-slate-900">{formattedCheckInTime}</strong> • Out{' '}
                    <strong className="text-slate-900">{formattedCheckOutTime}</strong>
                  </span>
                </div>
              )}

              {!isCheckedIn && !isCompleted && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {todayStatus?.is_holiday ? (
                      <span className="text-purple-700 font-medium">Holiday: {todayStatus.holiday_name}</span>
                    ) : todayStatus?.is_weekend ? (
                      <span className="text-slate-600 font-medium">Weekend Scheduled Off</span>
                    ) : todayStatus?.is_on_leave ? (
                      <span className="text-blue-700 font-medium">
                        On Leave: {todayStatus.leave_name} {todayStatus.is_half_day_leave ? '(Half Day)' : ''}
                      </span>
                    ) : (
                      'Ready to check in. Record your start time below.'
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: WORK DURATION CARD & PUNCH ACTION BUTTONS (7 COLS)
              ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            {/* WORK DURATION DISPLAY CARD */}
            {isCheckedIn ? (
              /* ACTIVE CHECKED IN STATE: SLEEK EXECUTIVE DARK TIMER */
              <div className="bg-linear-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
                {/* Ambient Soft Glow in background */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Timer className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Work Duration
                      </span>
                      <span className="text-[10px] text-slate-400">Live active session tracking</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>

                {/* Segmented Digital Clock Display */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-inner">
                      <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
                        {hrs.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Hours</span>
                  </div>

                  <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 pb-4 animate-pulse">:</span>

                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-inner">
                      <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
                        {mins.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Mins</span>
                  </div>

                  <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 pb-4 animate-pulse">:</span>

                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/90 border border-emerald-500/40 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-inner">
                      <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-wider">
                        {secs.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1">Secs</span>
                  </div>
                </div>

                {/* Progress bar towards 8h target */}
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Shift Progress (8h standard)</span>
                    <span className="font-bold text-emerald-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-linear-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : isCompleted ? (
              /* COMPLETED SHIFT CARD */
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Work Duration Logged
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Shift Done
                  </span>
                </div>

                <div className="my-2">
                  <span className="font-mono text-3xl font-black text-slate-900">
                    {todayStatus?.record?.work_duration_hours || '0.00'}{' '}
                    <span className="text-sm font-sans font-semibold text-slate-500">hours</span>
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    Shift recorded: {formattedCheckInTime} to {formattedCheckOutTime}.
                  </p>
                </div>

                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Timesheet updated automatically for HR payroll & auditing.</span>
                </div>
              </div>
            ) : (
              /* NOT CHECKED IN CARD */
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-200/70 text-slate-600">
                      <Timer className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Work Duration
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600">
                    Standby
                  </span>
                </div>

                <div className="my-2">
                  <span className="font-mono text-3xl font-bold text-slate-300">
                    --h : --m : --s
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Daily target: <strong className="text-slate-700">8h 00m</strong>. Punch in to begin tracking your active workday.
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Your GPS / IP timestamp will be verified on punch-in.</span>
                </div>
              </div>
            )}

            {/* PUNCH ACTIONS ROW */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                {/* CHECK IN BUTTON */}
                {canCheckIn && !isCheckedIn && !isCompleted && (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-98 transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
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
                    className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 active:scale-98 transition shadow-md hover:shadow-lg ring-2 ring-rose-200 disabled:opacity-50 cursor-pointer"
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

                {/* COMPLETED STATUS PILL IF ALREADY FINISHED */}
                {isCompleted && (
                  <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Today's Shift is Completed</span>
                  </div>
                )}

                {/* NOTES TOGGLE BUTTON */}
                {(!isCompleted || isCheckedIn) && (
                  <button
                    type="button"
                    onClick={() => setShowNotesInput(!showNotesInput)}
                    className={`p-3 rounded-xl border transition flex items-center justify-center relative cursor-pointer ${
                      showNotesInput || notes
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title={showNotesInput ? 'Hide notes' : 'Add punch notes'}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {notes && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-1.5 right-1.5 ring-2 ring-white" />
                    )}
                  </button>
                )}
              </div>

              {/* COLLAPSIBLE QUICK NOTES DRAWER */}
              {showNotesInput && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Optional Punch Notes</span>
                    {notes && (
                      <button
                        type="button"
                        onClick={() => setNotes('')}
                        className="text-slate-400 hover:text-rose-600 transition"
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
                    className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
                    autoFocus
                  />

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
            </div>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM STRIP: TODAY'S PUNCH SUMMARY METRICS (4 TILES)
            ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Punch In
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
              {formattedCheckInTime || '--:--'}
            </span>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Punch Out
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
              {formattedCheckOutTime || '--:--'}
            </span>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Shift Target
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
              8h 00m
            </span>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Session Status
            </span>
            <span
              className={`text-xs sm:text-sm font-bold mt-0.5 block ${
                isCheckedIn
                  ? 'text-emerald-600'
                  : isCompleted
                  ? 'text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              {isCheckedIn ? 'Active / On Duty' : isCompleted ? 'Completed' : 'Pending Start'}
            </span>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-rose-500 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Success notification banner */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button
              onClick={() => setSuccessMsg('')}
              className="text-emerald-500 hover:text-emerald-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
