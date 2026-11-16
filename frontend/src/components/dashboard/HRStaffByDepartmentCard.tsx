import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  Building,
  RefreshCw,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

interface DepartmentHeadcount {
  id: number;
  name: string;
  count: number;
  description?: string;
  percentage?: number;
}

interface HRStaffByDepartmentCardProps {
  initialDepartments?: any[];
}

export const HRStaffByDepartmentCard: React.FC<HRStaffByDepartmentCardProps> = ({
  initialDepartments,
}) => {
  const [departments, setDepartments] = useState<DepartmentHeadcount[]>([]);
  const [totalStaff, setTotalStaff] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!initialDepartments || initialDepartments.length === 0);
  const [error, setError] = useState<string | null>(null);

  const processDepartmentList = (rawList: any[]) => {
    const mapped: DepartmentHeadcount[] = rawList.map((d) => ({
      id: d.id,
      name: d.name,
      count:
        typeof d.count === 'number'
          ? d.count
          : typeof d.employee_count === 'number'
          ? d.employee_count
          : 0,
      description: d.description,
    }));

    // Sort descending by headcount count
    mapped.sort((a, b) => b.count - a.count);

    const total = mapped.reduce((sum, item) => sum + item.count, 0);

    // Compute percentages
    const withPercentage = mapped.map((d) => ({
      ...d,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
    }));

    setDepartments(withPercentage);
    setTotalStaff(total);
  };

  const fetchDepartmentStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get('/departments/');
      const rawList: any[] =
        Array.isArray(res.data?.results)
          ? res.data.results
          : (Array.isArray(res.data) ? res.data : []);

      processDepartmentList(rawList);
    } catch (err: any) {
      console.error('Failed to load department staff', err);
      if (!initialDepartments || initialDepartments.length === 0) {
        setError('Unable to load department headcounts.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialDepartments && initialDepartments.length > 0) {
      processDepartmentList(initialDepartments);
      setLoading(false);
    } else {
      fetchDepartmentStaff();
    }
  }, [initialDepartments]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Staff by Department
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Headcount distribution across operating business divisions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {totalStaff > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                {totalStaff} Total Staff
              </span>
            )}
            <button
              onClick={fetchDepartmentStaff}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              title="Refresh department staffing"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && departments.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Loading department allocations...</span>
          </div>
        ) : error && departments.length === 0 ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchDepartmentStaff}
              className="text-xs sm:text-sm font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : departments.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-700">No departments found</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active company departments and team allocations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {departments.map((dept, index) => {
              const maxCount = departments[0]?.count || 1;
              const relativeBarWidth = Math.max(8, Math.round((dept.count / maxCount) * 100));

              return (
                <div key={dept.id || index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 truncate">
                        {dept.name}
                      </span>
                      {dept.description && (
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">
                          — {dept.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-slate-900">
                        {dept.count} {dept.count === 1 ? 'member' : 'members'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 w-10 text-right">
                        {dept.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${relativeBarWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {departments.length > 0 && (
        <div className="pt-3.5 border-t border-slate-100 mt-5 flex items-center justify-between text-xs sm:text-sm text-slate-500">
          <span>Ranked by team headcount</span>
          <span className="font-semibold text-slate-700">{departments.length} Active Divisions</span>
        </div>
      )}
    </div>
  );
};
