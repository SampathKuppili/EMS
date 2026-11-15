import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { LeaveRequest } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import {
  AlertCircle,
  CheckCheck,
  X,
} from 'lucide-react';

export const ManagerInbox: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const [activeRequest, setActiveRequest] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const url =
        filter === 'PENDING'
          ? '/leave/requests/?status=PENDING'
          : '/leave/requests/';
      const res = await apiClient.get(url);
      setRequests(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load manager inbox', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [filter]);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!activeRequest) return;
    setActionLoading(true);
    setModalError(null);

    try {
      await apiClient.post(`/leave/requests/${activeRequest.id}/${decision}/`, {
        comment,
      });
      setActiveRequest(null);
      setComment('');
      fetchInbox();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object') {
        const key = Object.keys(detail)[0];
        setModalError(detail[key]?.[0] || 'Action failed.');
      } else {
        setModalError(detail || `Failed to ${decision} request.`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Approval Inbox</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review time off applications submitted by your direct reports and department team.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="inline-flex rounded-xl bg-white border border-slate-200/90 p-1 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('PENDING')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-slate-900 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Team Requests
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-3">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading inbox requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CheckCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">No applications to review</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filter === 'PENDING'
              ? 'There are currently no pending requests requiring your review.'
              : 'No team requests recorded in the system.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {req.employee.first_name
                        ? req.employee.first_name[0]
                        : req.employee.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {req.employee.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{req.employee.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-800">{req.leave_type.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-bold text-slate-900">
                      {req.duration_days} day{parseFloat(req.duration_days) === 1 ? '' : 's'}
                      {req.is_half_day && ' (Half-day)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dates:</span>
                    <span className="font-semibold text-slate-700">
                      {req.start_date} → {req.end_date}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Reason
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 italic">
                    "{req.reason}"
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  Submitted {new Date(req.submitted_at).toLocaleDateString()}
                </span>
                {req.status === 'PENDING' ? (
                  <button
                    onClick={() => {
                      setActiveRequest(req);
                      setComment('');
                      setModalError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Review Application
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Processed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Review Application #{activeRequest.id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeRequest.employee.full_name}</p>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 border border-rose-200 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-4 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-900">{activeRequest.employee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{activeRequest.leave_type.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold text-slate-900">
                  {activeRequest.start_date} to {activeRequest.end_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-900">
                  {activeRequest.duration_days} working day(s)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[11px] font-medium">Reason:</span>
                <p className="text-slate-700 mt-0.5 italic">"{activeRequest.reason}"</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Manager Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Remarks for approval or explanation for rejection..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('reject')}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('approve')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
