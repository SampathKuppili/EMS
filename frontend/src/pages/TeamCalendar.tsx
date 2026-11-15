import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { CalendarEvent, Holiday } from '../api/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Info,
  X,
  Palmtree,
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface CalendarDay {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export const TeamCalendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: CalendarEvent[];
    holidays: Holiday[];
  } | null>(null);

  // Holiday Modal for Admins
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidayDescription, setHolidayDescription] = useState<string>('');
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [holidaySuccess, setHolidaySuccess] = useState<string | null>(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR_MANAGER' || user?.is_admin || user?.is_hr;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [eventRes, holRes] = await Promise.all([
        apiClient.get(`/leave/calendar/?start_date=${startStr}&end_date=${endStr}`),
        apiClient.get('/holidays/'),
      ]);

      setEvents(eventRes.data || []);
      setHolidays(holRes.data.results || holRes.data || []);
    } catch (err) {
      console.error('Failed to load team calendar events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatIsoDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayIso = formatIsoDate(new Date());

  // Generate days grid
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, d);
    const dateStr = formatIsoDate(dateObj);
    const dayOfWeek = dateObj.getDay();
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    const dateStr = formatIsoDate(dateObj);
    const dayOfWeek = dateObj.getDay();
    days.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true,
      isToday: dateStr === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month leading days to complete week grid
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const dateObj = new Date(year, month + 1, i);
    const dateStr = formatIsoDate(dateObj);
    const dayOfWeek = dateObj.getDay();
    days.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false,
      isToday: dateStr === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  const currentMonthHolidays = holidays.filter((h) => {
    const [hYear, hMonth] = h.date.split('-');
    return Number(hYear) === year && Number(hMonth) === month + 1;
  });

  const uniqueEmployeesAway = Array.from(
    new Set(events.map((e) => e.employee_id))
  ).length;

  // Holiday CRUD Handlers
  const handleOpenAddHoliday = (prefillDate?: string) => {
    setEditingHoliday(null);
    setHolidayDate(prefillDate || formatIsoDate(new Date()));
    setHolidayName('');
    setHolidayDescription('');
    setHolidayError(null);
    setShowHolidayModal(true);
  };

  const handleOpenEditHoliday = (hol: Holiday) => {
    setEditingHoliday(hol);
    setHolidayDate(hol.date);
    setHolidayName(hol.name);
    setHolidayDescription(hol.description || '');
    setHolidayError(null);
    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = async (holId: number) => {
    if (!confirm('Are you sure you want to remove this public holiday?')) return;
    try {
      await apiClient.delete(`/holidays/${holId}/`);
      setHolidaySuccess('Holiday successfully deleted.');
      setSelectedDayEvents(null);
      fetchCalendar();
    } catch (err: any) {
      setHolidayError(err.response?.data?.detail || 'Failed to delete holiday.');
    }
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayError(null);
    try {
      if (editingHoliday) {
        await apiClient.patch(`/holidays/${editingHoliday.id}/`, {
          date: holidayDate,
          name: holidayName,
          description: holidayDescription,
        });
        setHolidaySuccess(`Holiday "${holidayName}" updated.`);
      } else {
        await apiClient.post('/holidays/', {
          date: holidayDate,
          name: holidayName,
          description: holidayDescription,
        });
        setHolidaySuccess(`Holiday "${holidayName}" added to calendar.`);
      }
      setShowHolidayModal(false);
      setSelectedDayEvents(null);
      fetchCalendar();
    } catch (err: any) {
      setHolidayError(err.response?.data?.detail || err.response?.data?.date?.[0] || 'Failed to save holiday.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Leave Calendar</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Company-wide leave schedule, corporate public holidays, and departmental coverage.
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAdminOrHR && (
            <button
              onClick={() => handleOpenAddHoliday()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Holiday</span>
            </button>
          )}

          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition active:scale-95 shadow-xs bg-white"
          >
            Today
          </button>

          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition shadow-xs"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[130px] text-center select-none">
              {currentDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition shadow-xs"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {holidaySuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{holidaySuccess}</span>
          </div>
          <button
            onClick={() => setHolidaySuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Legend & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Team Away
            </span>
            <span className="text-lg font-bold text-slate-900">
              {uniqueEmployeesAway} <span className="text-xs font-normal text-slate-500">members</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Holidays This Month
            </span>
            <span className="text-lg font-bold text-slate-900">
              {currentMonthHolidays.length} <span className="text-xs font-normal text-slate-500">days</span>
            </span>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span className="font-semibold text-slate-700">Approved Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />
              <span className="font-semibold text-slate-700">Pending Approval</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-100" />
              <span className="font-semibold text-slate-700">Public Holiday</span>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[11px] text-slate-500 items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Click any cell to inspect
          </span>
        </div>
      </div>

      {/* Main Calendar Card Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Syncing calendar events...</span>
          </div>
        ) : (
          <div>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                <div
                  key={d}
                  className={`text-xs font-bold tracking-wider uppercase ${idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-700'
                    }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
              {days.map((item) => {
                const dayEvents = events.filter(
                  (ev) => item.dateStr >= ev.start_date && item.dateStr <= ev.end_date
                );
                const dayHolidays = holidays.filter((h) => h.date === item.dateStr);

                return (
                  <div
                    key={item.dateStr}
                    onClick={() => {
                      setSelectedDayEvents({
                        dateStr: item.dateStr,
                        events: dayEvents,
                        holidays: dayHolidays,
                      });
                    }}
                    className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors duration-150 select-none cursor-pointer hover:bg-slate-50/90 ${!item.isCurrentMonth
                        ? 'bg-slate-50/60 text-slate-400'
                        : item.isToday
                          ? 'bg-indigo-50/30'
                          : item.isWeekend
                            ? 'bg-slate-50/30'
                            : 'bg-white'
                      }`}
                  >
                    {/* Top Row: Date Number & Holiday Pill */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-bold rounded-lg w-6 h-6 transition-colors ${item.isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : item.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                      >
                        {item.dayNum}
                      </span>

                      {dayHolidays.length > 0 && (
                        <span
                          title={dayHolidays[0].name}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded-md truncate max-w-[85px]"
                        >
                          <Palmtree className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                          <span className="truncate">{dayHolidays[0].name}</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Leave Events */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          title={`${ev.employee_name}: ${ev.leave_type} (${ev.status})`}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate border flex items-center justify-between gap-1 ${ev.status === 'APPROVED'
                              ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50/90 text-amber-800 border-amber-200'
                            }`}
                        >
                          <span className="truncate font-bold">
                            {ev.employee_name.split(' ')[0]}
                          </span>
                          <span className="font-mono text-[9px] uppercase px-1 rounded bg-white/80">
                            {ev.leave_type_code}
                          </span>
                        </div>
                      ))}

                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-slate-500 bg-slate-100/90 hover:bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-center transition">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="min-h-[14px]">
                      {dayEvents.some((e) => e.is_half_day) && (
                        <span className="text-[9px] font-medium text-slate-400">
                          ½ day
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Day Details Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {new Date(selectedDayEvents.dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Public Holiday Section with Admin Edit & Delete buttons */}
            {selectedDayEvents.holidays.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Public Holiday
                </span>
                {selectedDayEvents.holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-lg flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Palmtree className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs text-purple-900">{h.name}</p>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          {h.description || 'Company public holiday.'}
                        </p>
                      </div>
                    </div>

                    {isAdminOrHR && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditHoliday(h)}
                          className="p-1 rounded text-purple-700 hover:bg-purple-100 transition"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-100 transition"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Leave Absences Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Team Absences ({selectedDayEvents.events.length})
              </span>

              {selectedDayEvents.events.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No employee leaves scheduled for this date.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedDayEvents.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{ev.employee_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">{ev.leave_type}</span>
                          <span>•</span>
                          <span>{ev.duration_days} {Number(ev.duration_days) === 1 ? 'day' : 'days'}</span>
                          {ev.is_half_day && <span>• Half day</span>}
                        </div>
                      </div>
                      <StatusBadge status={ev.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              {isAdminOrHR && selectedDayEvents.holidays.length === 0 ? (
                <button
                  onClick={() => handleOpenAddHoliday(selectedDayEvents.dateStr)}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Holiday on this day</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Add / Edit Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingHoliday ? 'Edit Corporate Holiday' : 'Schedule Public Holiday'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage company holiday calendar.
                </p>
              </div>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {holidayError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                {holidayError}
              </div>
            )}

            <form onSubmit={handleSaveHoliday} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thanksgiving Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corporate paid public holiday"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition active:scale-95"
                >
                  {editingHoliday ? 'Update Holiday' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
