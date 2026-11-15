import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { LeaveRequest } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import {
  AlertCircle,
  CheckCheck,
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
      const url = filter === 'PENDING'
        ? '/leave/requests/?status=PENDING'
        : '/leave/requests/';
      const res = await apiClient.get(url);
      setRequests(res.data.results || res.data);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Approval Inbox</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review time off applications submitted by your direct reports and department.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-white border border-slate-200/80 p-1 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'PENDING'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All Team Requests
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
          <CheckCheck className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-slate-800">No applications to review</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {filter === 'PENDING'
              ? 'There are currently no pending requests requiring your approval.'
              : 'No team requests recorded.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {req.employee.first_name ? req.employee.first_name[0] : req.employee.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{req.employee.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{req.employee.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <div className="mt-4 p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800">{req.leave_type.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <span className="font-bold text-slate-900">
                      {req.duration_days} day{parseFloat(req.duration_days) === 1 ? '' : 's'}
                      {req.is_half_day && ' (Half-day)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dates:</span>
                    <span className="font-medium text-slate-700">
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
                <span className="text-[10px] text-slate-400">
                  {new Date(req.submitted_at).toLocaleDateString()}
                </span>
                {req.status === 'PENDING' ? (
                  <button
                    onClick={() => {
                      setActiveRequest(req);
                      setComment('');
                      setModalError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
                  >
                    Review
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Processed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Application #{activeRequest.id}</h3>
                <p className="text-xs text-slate-400">{activeRequest.employee.full_name}</p>
              </div>
              <StatusBadge status={activeRequest.status} size="sm" />
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-4 space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-800">{activeRequest.employee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800">{activeRequest.leave_type.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold text-slate-800">
                  {activeRequest.start_date} to {activeRequest.end_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-900">
                  {activeRequest.duration_days} working day(s)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[11px]">Reason:</span>
                <p className="text-slate-700 mt-0.5 italic">"{activeRequest.reason}"</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Manager Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Remarks for approval or mandatory explanation for rejection..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('reject')}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium transition disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('approve')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition disabled:opacity-50"
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
