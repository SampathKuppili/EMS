import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { LeaveRequest } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  MessageSquare,
  XCircle,
  Plus,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [cancellingRequest, setCancellingRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === 'ALL'
          ? '/leave/requests/'
          : `/leave/requests/?status=${statusFilter}`;
      const res = await apiClient.get(url);
      setRequests(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRequest) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      await apiClient.post(`/leave/requests/${cancellingRequest.id}/cancel/`, {
        cancellation_reason: cancelReason,
      });
      setCancellingRequest(null);
      setCancelReason('');
      fetchRequests();
    } catch (err: any) {
      setCancelError(err.response?.data?.detail || 'Failed to cancel leave request.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      req.leave_type.name.toLowerCase().includes(term) ||
      req.reason.toLowerCase().includes(term) ||
      req.start_date.includes(term) ||
      req.end_date.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-1">
            History of your submitted time off requests and manager decisions.
          </p>
        </div>

        <Link
          to="/apply"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by category, date, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 placeholder:text-slate-400 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-3">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading leave applications...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">No applications found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter !== 'ALL'
              ? `No leave records matching status '${statusFilter}'.`
              : 'You have not submitted any leave applications yet. Click "New Application" to apply for time off.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Duration Badge */}
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-900 flex flex-col items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                  <span className="text-sm font-extrabold leading-none">{parseFloat(req.duration_days)}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                    {parseFloat(req.duration_days) === 1 ? 'day' : 'days'}
                  </span>
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{req.leave_type.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-500 font-medium">
                      #{req.id}
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                    {req.is_half_day && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Half Day
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      {req.start_date} → {req.end_date}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Submitted on {new Date(req.submitted_at).toLocaleDateString()}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    "{req.reason}"
                  </p>

                  {/* Manager review remarks */}
                  {req.approval_history && req.approval_history.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">
                          {req.approval_history[0].approver_name}:
                        </span>{' '}
                        <span>{req.approval_history[0].comment || 'Approved without additional comment.'}</span>
                      </div>
                    </div>
                  )}

                  {req.cancellation_reason && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      <strong className="text-slate-700">Cancellation Note:</strong> {req.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action */}
              {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setCancellingRequest(req)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cancel Leave Request</h3>
              <button
                onClick={() => {
                  setCancellingRequest(null);
                  setCancelReason('');
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Are you sure you want to cancel your <strong>{cancellingRequest.leave_type.name}</strong> ({cancellingRequest.start_date} to {cancellingRequest.end_date})?
              {cancellingRequest.status === 'APPROVED' && (
                <span className="block mt-2 font-medium text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  Deducted quota ({cancellingRequest.duration_days} days) will be refunded to your balance immediately.
                </span>
              )}
            </p>

            {cancelError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Schedule changed, personal plans rescheduled"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingRequest(null);
                    setCancelReason('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Keep Request
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
