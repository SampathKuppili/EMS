import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export const HRMetricStatsCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  badgeText,
  badgeType = 'neutral',
  icon: Icon,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-50 border-indigo-100',
}) => {
  const badgeClasses = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  }[badgeType];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-3xl font-black text-slate-900 tracking-tight block">
          {value}
        </span>

        <div className="mt-2 flex items-center justify-between gap-2">
          {subtitle && (
            <span className="text-[11px] text-slate-400 truncate block">
              {subtitle}
            </span>
          )}

          {badgeText && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeClasses}`}>
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
