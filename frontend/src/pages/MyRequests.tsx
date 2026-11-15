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
      const url = statusFilter === 'ALL'
        ? '/leave/requests/'
        : `/leave/requests/?status=${statusFilter}`;
      const res = await apiClient.get(url);
      setRequests(res.data.results || res.data);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            History of your submitted time off requests and manager decisions.
          </p>
        </div>

        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Application</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              {st === 'ALL' ? 'All Requests' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-slate-800">No applications found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {statusFilter !== 'ALL'
              ? `No leave records matching status '${statusFilter}'.`
              : 'You have not submitted any leave applications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Duration Badge */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex flex-col items-center justify-center font-bold text-xs shrink-0 border border-slate-200/60">
                  <span className="text-sm font-bold leading-none">{parseFloat(req.duration_days)}</span>
                  <span className="text-[9px] uppercase font-medium text-slate-500 mt-0.5">
                    {parseFloat(req.duration_days) === 1 ? 'day' : 'days'}
                  </span>
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{req.leave_type.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-500">
                      #{req.id}
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                    {req.is_half_day && (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                        Half Day
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {req.start_date} → {req.end_date}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Submitted on {new Date(req.submitted_at).toLocaleDateString()}</span>
                  </div>

                  <p className="text-xs text-slate-600 italic mt-1 line-clamp-2">
                    "{req.reason}"
                  </p>

                  {/* Manager review remarks */}
                  {req.approval_history && req.approval_history.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-700 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">
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
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Cancel Leave Request</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel your <strong>{cancellingRequest.leave_type.name}</strong> ({cancellingRequest.start_date} to {cancellingRequest.end_date})?
              {cancellingRequest.status === 'APPROVED' && (
                <span className="block mt-1.5 font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                  Deducted quota ({cancellingRequest.duration_days} days) will be refunded to your balance immediately.
                </span>
              )}
            </p>

            {cancelError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Schedule changed, personal plans rescheduled"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingRequest(null);
                    setCancelReason('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Keep Request
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-medium text-white transition disabled:opacity-50"
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
