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

  // Live timer state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Fetch today status
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
  }, []);

  // Update current live time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
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

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/attendance/check-in/', { notes });
      const checkInTime = res.data.record?.check_in
        ? new Date(res.data.record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      setSuccessMsg(checkInTime ? `Successfully checked in at ${checkInTime}.` : (res.data.message || 'Successfully checked in!'));
      setShowNotesInput(false);
      setNotes('');
      await fetchStatus();
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
      setSuccessMsg(checkOutTime ? `Successfully checked out at ${checkOutTime}.` : (res.data.message || 'Successfully checked out!'));
      setShowNotesInput(false);
      setNotes('');
      await fetchStatus();
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-3"></div>
        <div className="h-10 bg-slate-100 rounded w-full"></div>
      </div>
    );
  }

  const isCheckedIn = todayStatus?.record?.is_checked_in;
  const isCompleted = todayStatus?.record?.is_completed;
  const canCheckIn = todayStatus?.can_check_in;
  const canCheckOut = todayStatus?.can_check_out;

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200">
      {/* Top Banner Gradient Strip */}
      <div
        className={`h-1.5 w-full ${isCheckedIn
            ? 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 animate-pulse'
            : isCompleted
              ? 'bg-linear-to-r from-blue-500 to-indigo-600'
              : 'bg-linear-to-r from-slate-300 via-slate-400 to-slate-500'
          }`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Clock and Attendance Status info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                Daily Attendance & Punch
              </span>

              {/* Status Badge */}
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

              {isCheckedIn && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active Work Session
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {currentTime}
              </h2>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Context descriptions */}
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              {isCheckedIn && formattedCheckInTime && (
                <span className="text-slate-700 font-medium">
                  Checked in at <strong className="text-slate-900">{formattedCheckInTime}</strong>
                </span>
              )}

              {isCompleted && (
                <span className="text-slate-700 font-medium">
                  In: <strong className="text-slate-900">{formattedCheckInTime}</strong> • Out:{' '}
                  <strong className="text-slate-900">{formattedCheckOutTime}</strong> • Duration:{' '}
                  <strong className="text-emerald-700">
                    {todayStatus?.record?.work_duration_hours} hrs
                  </strong>
                </span>
              )}

              {!isCheckedIn && !isCompleted && todayStatus?.is_holiday && (
                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-medium">
                  Company Holiday: {todayStatus.holiday_name}
                </span>
              )}

              {!isCheckedIn && !isCompleted && todayStatus?.is_weekend && (
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  Scheduled Weekend Off
                </span>
              )}

              {!isCheckedIn && !isCompleted && todayStatus?.is_on_leave && (
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                  Scheduled Leave: {todayStatus.leave_name}{' '}
                  {todayStatus.is_half_day_leave ? '(Half Day)' : '(Full Day)'}
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Timer / Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Live Stopwatch Counter if Checked In */}
            {isCheckedIn && (
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-xs">
                <Timer className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Work Duration
                  </span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* Check In Action Button */}
            {canCheckIn && !isCheckedIn && !isCompleted && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 transition shadow-xs disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{actionLoading ? 'Checking in...' : 'Check In Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNotesInput(!showNotesInput)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                    title="Add notes to check-in"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>

                {showNotesInput && (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Remote work, Client site..."
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Check Out Action Button */}
            {canCheckOut && isCheckedIn && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    id="widget-checkout-btn"
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition shadow-sm ring-2 ring-rose-200 disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{actionLoading ? 'Checking out...' : 'Check Out Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNotesInput(!showNotesInput)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                    title="Add wrap-up notes"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>

                {showNotesInput && (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Completed sprint tickets, client demo..."
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Completed badge or view history link */}
            {isCompleted && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Day Completed
                </span>
              </div>
            )}

            {/* Link to full Attendance & Records page */}
            <Link
              to="/attendance"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200/80"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Success notification banner */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
};
