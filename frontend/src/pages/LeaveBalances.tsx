import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { LeaveBalance, LeaveType, User } from '../api/types';
import {
  WalletCards,
  Calendar,
  Users,
  Settings,
  Info,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export const LeaveBalances: React.FC = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Allocation Modal for HR / Managers
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  const [allocEmpId, setAllocEmpId] = useState<number | ''>('');
  const [allocTypeId, setAllocTypeId] = useState<number | ''>('');
  const [allocDays, setAllocDays] = useState<string>('15.0');
  const [allocCarryForward, setAllocCarryForward] = useState<string>('0.0');
  const [allocSuccess, setAllocSuccess] = useState<string | null>(null);
  const [allocError, setAllocError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.is_admin;
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || user?.is_hr;
  const isManagerOrAdmin = user?.role === 'MANAGER' || isHR;

  useEffect(() => {
    if (isManagerOrAdmin) {
      apiClient.get('/users/').then((res) => {
        setTeamMembers(res.data.results || res.data || []);
      }).catch(() => { });
      apiClient.get('/leave/types/').then((res) => {
        setLeaveTypes(res.data.results || res.data || []);
      }).catch(() => { });
    }
  }, [isManagerOrAdmin]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      let url = `/leave/balance/?year=${year}`;
      if (selectedEmployeeId) {
        url += `&employee=${selectedEmployeeId}`;
      }
      const res = await apiClient.get(url);
      setBalances(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load leave balances', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [year, selectedEmployeeId]);

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocError(null);
    try {
      await apiClient.post('/leave/balance/allocate/', {
        employee_id: allocEmpId,
        leave_type_id: allocTypeId,
        allocated_days: allocDays,
        carried_forward_days: allocCarryForward,
        year: year,
      });
      setShowAllocateModal(false);
      setAllocSuccess('Leave quota and carry-forward balance successfully allocated.');
      fetchBalances();
    } catch (err: any) {
      setAllocError(err.response?.data?.detail || 'Failed to allocate balance.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Quotas & Carry-Forward Balances</h1>
          <p className="text-xs text-slate-500 mt-1">
            Overview of fresh annual allowances, unused carry-forward leaves from previous year, and active available balances.
          </p>
        </div>

        {/* Filter & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {isHR && (
            <button
              onClick={() => {
                setAllocError(null);
                setShowAllocateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Allocate Balance</span>
            </button>
          )}

          {isManagerOrAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none font-medium cursor-pointer"
              >
                <option value="">All Visible Employees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {allocSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{allocSuccess}</span>
          </div>
          <button
            onClick={() => setAllocSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Corporate Policy Note Card */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Software Office Policy: </span>
          Full-time engineering staff can carry forward up to <strong>5.0 unused annual leave days</strong> into the new calendar year. Carried-over days are automatically aggregated into your total available quota and deducted before new annual allowances.
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Fetching balance records...</span>
        </div>
      ) : balances.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <WalletCards className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">No balances allocated for Year {year}</p>
          <p className="text-xs text-slate-400 mt-1">
            Please ask HR Operations to allocate leave balances for this period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {balances.map((b) => {
            const allocated = parseFloat(b.allocated_days || '0');
            const carried = parseFloat(b.carried_forward_days || '0');
            const total = parseFloat(b.total_allocated_days || String(allocated + carried));
            const used = parseFloat(b.used_days || '0');
            const remaining = parseFloat(b.remaining_days || '0');
            const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider font-mono">
                          {b.leave_type_code}
                        </span>
                        {carried > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-2.5 h-2.5" />
                            +{carried} Carried Forward
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {b.leave_type_name}
                      </h3>
                      {b.employee_name && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{b.employee_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Main Remaining Days Display */}
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {remaining}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">days available</span>
                  </div>

                  {/* Breakdown details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Annual Fresh Allowance:</span>
                      <span className="font-semibold text-slate-800">{allocated} days</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Carried Forward from {year - 1}:</span>
                      <span className="font-semibold text-emerald-700">+{carried} days</span>
                    </div>

                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-dashed border-slate-200">
                      <span>Total Effective Quota:</span>
                      <span>{total} days</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                      <span>{used} days consumed</span>
                      <span>{remaining} remaining</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Period: Year {b.year}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${remaining > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                  >
                    {remaining > 0 ? 'Active Quota' : 'Exhausted'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Allocation Modal for HR/Managers */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Allocate Quota & Carry-Forward</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure annual allowance and carried-over days.
                </p>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {allocError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs">
                {allocError}
              </div>
            )}

            <form onSubmit={handleAllocateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Employee
                </label>
                <select
                  required
                  value={allocEmpId}
                  onChange={(e) => setAllocEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {teamMembers.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Leave Category
                </label>
                <select
                  required
                  value={allocTypeId}
                  onChange={(e) => setAllocTypeId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Category...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Annual Quota (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={allocDays}
                    onChange={(e) => setAllocDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Carry-Forward (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={allocCarryForward}
                    onChange={(e) => setAllocCarryForward(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition active:scale-95"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
