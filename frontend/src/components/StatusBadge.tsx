import React from 'react';
import type { LeaveStatus } from '../api/types';

interface StatusBadgeProps {
  status: LeaveStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<string, { bg: string; dot: string; label: string }> = {
    APPROVED: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Approved',
    },
    PENDING: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      label: 'Pending Review',
    },
    REJECTED: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      dot: 'bg-rose-500',
      label: 'Rejected',
    },
    CANCELLED: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      dot: 'bg-slate-400',
      label: 'Cancelled',
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
