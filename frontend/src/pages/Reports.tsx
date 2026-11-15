import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { ReportSummary } from '../api/types';
import {
  Calendar,
  FileText,
  ShieldCheck,
  Building,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
} from 'lucide-react';

interface AuditLogItem {
  id: number;
  actor_email: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AUDIT'>('ANALYTICS');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [auditSearch, setAuditSearch] = useState<string>('');

  const isHR = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<ReportSummary>(`/reports/summary/?year=${year}`);
        setReport(res.data);

        if (isHR) {
          const auditRes = await apiClient.get('/reports/audit-logs/');
          setAuditLogs(auditRes.data.results || auditRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load report data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [year, isHR]);

  const filteredLogs = auditLogs.filter((log) => {
    const term = auditSearch.toLowerCase();
    const actor = (log.actor_name || log.actor_email || '').toLowerCase();
    const action = (log.action || '').toLowerCase();
    const entity = `${log.entity_type} ${log.entity_id}`.toLowerCase();
    return actor.includes(term) || action.includes(term) || entity.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Executive Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Time-off utilization trends, departmental absence patterns, and compliance audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {isHR && (
            <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-300">
              <button
                onClick={() => setActiveTab('ANALYTICS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'ANALYTICS'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('AUDIT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'AUDIT'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit Trail
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
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

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">Computing report metrics...</span>
        </div>
      ) : activeTab === 'ANALYTICS' && report ? (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Requests
                </span>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-2xl font-black text-slate-900 mt-2 block tracking-tight">
                {report.summary.total_requests}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                All submitted applications
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Pending Reviews
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-800 mt-2 block tracking-tight">
                {report.summary.total_pending}
              </span>
              <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
                Awaiting manager decision
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Approved
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-800 mt-2 block tracking-tight">
                {report.summary.total_approved}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                Confirmed leaves
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  Days Consumed
                </span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-indigo-800 mt-2 block tracking-tight">
                {report.summary.total_approved_days}
              </span>
              <span className="text-[11px] text-indigo-700 font-medium mt-0.5 block">
                Working days absence
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                  Closed / Inactive
                </span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-800 mt-2 block tracking-tight">
                {report.summary.total_rejected + report.summary.total_cancelled}
              </span>
              <span className="text-[11px] text-rose-700 font-medium mt-0.5 block">
                {report.summary.total_rejected} rejected • {report.summary.total_cancelled} cancelled
              </span>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Leave Category */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Absences by Leave Category
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {report.by_leave_type.length} Categories
                </span>
              </div>

              {report.by_leave_type.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">
                  No approved leave recorded for year {year}.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {report.by_leave_type.map((lt) => {
                    const maxDays = Math.max(...report.by_leave_type.map((i) => i.total_days), 1);
                    const percent = Math.round((lt.total_days / maxDays) * 100);

                    return (
                      <div key={lt.code} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{lt.name}</span>
                            <span className="font-mono text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {lt.code}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-700">
                            {lt.total_days} {lt.total_days === 1 ? 'day' : 'days'}{' '}
                            <span className="text-[11px] font-normal text-slate-500">
                              ({lt.request_count} {lt.request_count === 1 ? 'request' : 'requests'})
                            </span>
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Department */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Absences by Department
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {report.by_department.length} Departments
                </span>
              </div>

              {report.by_department.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">
                  No departmental absences recorded for year {year}.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {report.by_department.map((dept) => {
                    const maxDays = Math.max(...report.by_department.map((i) => i.total_days), 1);
                    const percent = Math.round((dept.total_days / maxDays) * 100);

                    return (
                      <div key={dept.department} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-900">{dept.department}</span>
                          <span className="text-xs font-bold text-indigo-700">
                            {dept.total_days} {dept.total_days === 1 ? 'day' : 'days'}{' '}
                            <span className="text-[11px] font-normal text-slate-500">
                              ({dept.request_count} {dept.request_count === 1 ? 'leave' : 'leaves'})
                            </span>
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'AUDIT' && isHR ? (
        <div className="space-y-4">
          {/* Audit Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter audit logs by actor, action, or entity..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filteredLogs.length} events
            </span>
          </div>

          {/* Audit Logs Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Immutable Consequential Actions Log
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Metadata & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No audit events match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{log.actor_name || log.actor_email}</p>
                          {log.actor_name && (
                            <p className="text-[10px] text-slate-400">{log.actor_email}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.action.includes('APPROV')
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : log.action.includes('REJECT')
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : log.action.includes('CANCEL')
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {log.entity_type} <span className="font-mono text-slate-500">#{log.entity_id}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-sm truncate text-[11px]">
                          {typeof log.details === 'object' && log.details !== null ? (
                            <span className="font-mono text-[10px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {Object.entries(log.details)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' • ')}
                            </span>
                          ) : (
                            String(log.details)
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
