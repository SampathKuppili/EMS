import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { LeaveType, LeaveBalance } from '../api/types';
import {
  Clock,
  AlertCircle,
  Send,
  Info,
  ShieldAlert,
} from 'lucide-react';

export const ApplyLeave: React.FC = () => {
  const navigate = useNavigate();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');

  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, balRes] = await Promise.all([
          apiClient.get('/leave/types/'),
          apiClient.get('/leave/balance/'),
        ]);
        const types = typesRes.data.results || typesRes.data;
        const bals = balRes.data.results || balRes.data;
        setLeaveTypes(types);
        setBalances(bals);
        if (types.length > 0) {
          setSelectedTypeId(types[0].id);
        }
      } catch (err) {
        console.error('Failed to load leave types', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isHalfDay && startDate) {
      setEndDate(startDate);
    }
  }, [isHalfDay, startDate]);

  useEffect(() => {
    if (!startDate || !endDate) {
      setPreviewDuration(null);
      setPreviewError(null);
      return;
    }

    if (startDate > endDate) {
      setPreviewError('End date cannot be earlier than start date.');
      setPreviewDuration(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      setPreviewError(null);
      try {
        const res = await apiClient.post('/leave/requests/preview-duration/', {
          start_date: startDate,
          end_date: endDate,
          is_half_day: isHalfDay,
        });
        setPreviewDuration(parseFloat(res.data.duration_days));
      } catch (err: any) {
        setPreviewDuration(null);
        const errorDetail = err.response?.data?.error;
        if (typeof errorDetail === 'object') {
          const firstKey = Object.keys(errorDetail)[0];
          setPreviewError(errorDetail[firstKey]?.[0] || 'Invalid dates.');
        } else {
          setPreviewError(errorDetail || 'Could not compute leave duration.');
        }
      } finally {
        setIsCalculating(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [startDate, endDate, isHalfDay]);

  const selectedType = leaveTypes.find((t) => t.id === selectedTypeId);
  const selectedBalance = balances.find((b) => b.leave_type === selectedTypeId);
  const remainingAllowance = selectedBalance ? parseFloat(selectedBalance.remaining_days) : 0;
  const balanceAfter = previewDuration !== null ? remainingAllowance - previewDuration : null;
  const isInsufficient = balanceAfter !== null && balanceAfter < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedTypeId) {
      setSubmitError('Please select a leave category.');
      return;
    }
    if (!startDate || !endDate) {
      setSubmitError('Please select both start and end dates.');
      return;
    }
    if (previewError) {
      setSubmitError(previewError);
      return;
    }
    if (isInsufficient) {
      setSubmitError(
        `Insufficient leave quota. You requested ${previewDuration} days, but only ${remainingAllowance} days are available.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/leave/requests/', {
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        is_half_day: isHalfDay,
        reason,
      });
      navigate('/requests');
    } catch (err: any) {
      const data = err.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        setSubmitError(Array.isArray(val) ? val[0] : String(val));
      } else {
        setSubmitError('Failed to submit leave request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Request Time Off</h1>
        <p className="text-xs text-slate-500 mt-1">
          Submit your application. Working days are computed dynamically, skipping weekend days and company holidays.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-semibold">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form Fields Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            {/* Category Selector */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Leave Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {leaveTypes.map((type) => {
                  const bal = balances.find((b) => b.leave_type === type.id);
                  const remaining = bal ? parseFloat(bal.remaining_days) : 0;
                  const isSelected = selectedTypeId === type.id;

                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedTypeId(type.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-slate-900">{type.name}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {type.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{type.description}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Available:</span>
                        <span className={`font-bold ${remaining > 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                          {remaining}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Half-Day Switch Card */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Half-day leave</p>
                  <p className="text-xs text-slate-500">Apply for 0.5 working day on a single date</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    disabled={isHalfDay}
                    value={isHalfDay ? startDate : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 transition shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Reason / Remarks
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe the reason for your time off request..."
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Sticky Summary & Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 sticky top-20">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Request Calculation Preview
            </h3>

            {/* Selected category pill */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Category:</span>
              <span className="font-bold text-slate-900">{selectedType?.name || 'Not selected'}</span>
            </div>

            {/* Calculated working days */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Working Days:</span>
                {isCalculating ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </span>
                ) : previewError ? (
                  <span className="text-rose-600 font-semibold">{previewError}</span>
                ) : previewDuration !== null ? (
                  <span className="font-bold text-slate-900 text-sm">
                    {previewDuration} day{previewDuration === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-slate-400">Select dates</span>
                )}
              </div>

              {previewDuration !== null && !previewError && (
                <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Current Quota:</span>
                    <span className="font-semibold text-slate-900">{remainingAllowance}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance After:</span>
                    <span className={`font-bold ${isInsufficient ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {balanceAfter}d
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isInsufficient && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-[11px] flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>Requested duration exceeds your remaining leave allowance for this category.</span>
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Saturdays, Sundays & official holidays are excluded automatically.</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={submitting || previewDuration === null || isInsufficient || !!previewError}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-xs transition disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/requests')}
                className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
