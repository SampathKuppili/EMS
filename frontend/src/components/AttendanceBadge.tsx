import React from 'react';
import type { AttendanceStatus } from '../api/types';

interface AttendanceBadgeProps {
  status: AttendanceStatus | string;
  size?: 'sm' | 'md';
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<string, { bg: string; dot: string; label: string }> = {
    PRESENT: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Present',
    },
    HALF_DAY: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      label: 'Half Day',
    },
    ON_LEAVE: {
      bg: 'bg-sky-50 border-sky-200 text-sky-800',
      dot: 'bg-sky-500',
      label: 'On Leave',
    },
    ABSENT: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      dot: 'bg-rose-500',
      label: 'Absent',
    },
    UNPAID_LEAVE: {
      bg: 'bg-orange-50 border-orange-200 text-orange-800',
      dot: 'bg-orange-500',
      label: 'Unpaid Leave',
    },
    HOLIDAY: {
      bg: 'bg-purple-50 border-purple-200 text-purple-800',
      dot: 'bg-purple-500',
      label: 'Holiday',
    },
    CHECKED_IN: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Checked In',
    },
    NOT_CHECKED_IN: {
      bg: 'bg-slate-100 border-slate-200 text-slate-600',
      dot: 'bg-slate-400',
      label: 'Not Checked In',
    },
    WEEKEND: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      dot: 'bg-slate-400',
      label: 'Weekend',
    },
  };

  const current = styles[status] || {
    bg: 'bg-slate-100 border-slate-200 text-slate-700',
    dot: 'bg-slate-400',
    label: status,
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border ${current.bg} ${sizeClasses} tracking-tight select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
