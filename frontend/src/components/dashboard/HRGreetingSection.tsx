import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  UserPlus,
} from 'lucide-react';

interface HRGreetingSectionProps {
  onboardLink?: string;
  calendarLink?: string;
}

export const HRGreetingSection: React.FC<HRGreetingSectionProps> = ({
  onboardLink = '/hr',
  calendarLink = '/calendar',
}) => {
  const { user } = useAuth();

  // Determine time-based personalized greeting
  const getGreeting = (): string => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return 'Good morning';
    } else if (currentHour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const displayName = user?.first_name || user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Administrator';
  const isAdmin = user?.role === 'ADMIN' || user?.is_admin;
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || user?.is_hr;

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
          <span>{todayFormatted}</span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-700">
            {isAdmin
              ? 'System Administration & Global Directory'
              : 'People Operations & Workforce Analytics'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
          <span>{getGreeting()}, {displayName}</span>
          <span
            className={`text-xs sm:text-sm px-3 py-1 rounded-full font-bold border ${
              isAdmin
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            {isAdmin ? 'System Administrator' : 'HR Operations Lead'}
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-500 max-w-3xl leading-relaxed">
          Real-time oversight of daily attendance, leave approvals, upcoming organizational holidays, and departmental headcounts.
        </p>
      </div>

      {/* Header Quick Actions */}
      <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
        {isHR && (
          <Link
            to={onboardLink}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Staff</span>
          </Link>
        )}

        <Link
          to={calendarLink}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition bg-white shadow-2xs"
        >
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <span>Calendar</span>
        </Link>
      </div>
    </div>
  );
};
