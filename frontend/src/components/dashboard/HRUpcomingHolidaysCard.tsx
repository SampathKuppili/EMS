import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  CalendarDays,
  Palmtree,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export type HolidayItemType = 'PUBLIC_HOLIDAY' | 'OPTIONAL_HOLIDAY' | 'APPLIED_LEAVE';

export interface UpcomingEventItem {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: HolidayItemType;
  typeLabel: string;
  description?: string;
  employeeName?: string;
}

export const HRUpcomingHolidaysCard: React.FC = () => {
  const [events, setEvents] = useState<UpcomingEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayIso = `${y}-${m}-${d}`;

      // Fetch corporate holidays and approved leaves using Promise.allSettled for fault tolerance
      const [holRes, leaveRes] = await Promise.allSettled([
        apiClient.get('/holidays/'),
        apiClient.get('/leave/requests/?status=APPROVED'),
      ]);

      const holidays: any[] =
        holRes.status === 'fulfilled' && Array.isArray(holRes.value.data?.results)
          ? holRes.value.data.results
          : (holRes.status === 'fulfilled' && Array.isArray(holRes.value.data) ? holRes.value.data : []);

      const leaves: any[] =
        leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data?.results)
          ? leaveRes.value.data.results
          : (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data) ? leaveRes.value.data : []);

      if (holRes.status === 'rejected' && leaveRes.status === 'rejected') {
        throw new Error('Both holidays and leave schedules failed to load.');
      }

      const combined: UpcomingEventItem[] = [];

      // 1. Process Holidays
      holidays.forEach((h) => {
        if (h && h.date && h.date >= todayIso) {
          const isOptional =
            (h.name && String(h.name).toLowerCase().includes('optional')) ||
            (h.description && String(h.description).toLowerCase().includes('optional'));

          combined.push({
            id: `hol-${h.id}`,
            title: h.name || 'Public Holiday',
            date: h.date,
            type: isOptional ? 'OPTIONAL_HOLIDAY' : 'PUBLIC_HOLIDAY',
            typeLabel: isOptional ? 'Optional Holiday' : 'Public Holiday',
            description: h.description || (isOptional ? 'Optional floating observance' : 'Corporate public holiday'),
          });
        }
      });

      // 2. Process Applied / Approved Leaves
      leaves.forEach((l) => {
        if (!l) return;
        const leaveEnd = l.end_date || l.start_date;
        if (leaveEnd && leaveEnd >= todayIso) {
          const empName = l.employee?.full_name || l.employee_name || 'Staff Member';
          const typeName = l.leave_type?.name || l.leave_type || 'Leave';

          combined.push({
            id: `leave-${l.id}`,
            title: `${empName} - ${typeName}`,
            date: l.start_date,
            endDate: l.end_date,
            type: 'APPLIED_LEAVE',
            typeLabel: 'Applied Leave',
            employeeName: empName,
            description: `${l.duration_days ?? 1} ${Number(l.duration_days) === 1 ? 'day' : 'days'}${l.is_half_day ? ' (Half Day)' : ''}${l.reason ? ` • ${l.reason}` : ''}`,
          });
        }
      });

      // Sort ascending by start date
      combined.sort((a, b) => a.date.localeCompare(b.date));

      setEvents(combined);
    } catch (err: any) {
      console.error('Failed to load upcoming holidays & leaves', err);
      setError('Unable to load upcoming holidays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const getDaysAway = (targetDateStr: string): string => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [y, m, d] = targetDateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 30) return `In ${diffDays} days`;
      if (diffDays < 60) return 'Next month';
      return `In ${Math.round(diffDays / 30)} mos`;
    } catch {
      return '';
    }
  };

  const getBadgeStyle = (type: HolidayItemType): string => {
    switch (type) {
      case 'PUBLIC_HOLIDAY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OPTIONAL_HOLIDAY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPLIED_LEAVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Upcoming Holidays & Time Off
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Public holidays, optional observances, and scheduled employee leaves.
              </p>
            </div>
          </div>

          <button
            onClick={fetchUpcomingEvents}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            title="Refresh upcoming dates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        {loading && events.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading upcoming dates...</span>
          </div>
        ) : error && events.length === 0 ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchUpcomingEvents}
              className="text-xs sm:text-sm font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Palmtree className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-700">No upcoming holidays scheduled</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              All company-wide public holidays and applied staff leaves from today onward appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {events.slice(0, 6).map((item) => {
              const daysAway = getDaysAway(item.date);
              const formattedDate = new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between gap-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                          item.type
                        )}`}
                      >
                        {item.typeLabel}
                      </span>
                      {daysAway && (
                        <span className="text-xs font-medium text-slate-400">
                          {daysAway}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-1.5 truncate">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-bold text-slate-800 block">
                      {formattedDate}
                    </span>
                    {item.endDate && item.endDate !== item.date && (
                      <span className="text-xs text-slate-400 block">
                        thru {new Date(`${item.endDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="pt-3.5 border-t border-slate-100 mt-5 flex items-center justify-between text-xs sm:text-sm text-slate-500">
          <span>Displaying nearest scheduled milestones</span>
          <span className="font-semibold text-slate-700">{events.length} Upcoming</span>
        </div>
      )}
    </div>
  );
};
