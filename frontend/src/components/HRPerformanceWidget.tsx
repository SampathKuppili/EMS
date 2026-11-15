import React, { useState } from 'react';
import type { HRPerformanceData } from '../api/types';
import {
  Award,
  Target,
  Zap,
  Clock,
  Star,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  data: HRPerformanceData;
}

export const HRPerformanceWidget: React.FC<Props> = ({ data }) => {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Performance & Productivity Analytics
            </h3>
            <p className="text-[11px] text-slate-400">
              Departmental velocity, goal achievement, and evaluation ratings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Q4 Performance Cycle Active</span>
          </span>
        </div>
      </div>

      {/* Primary 3 Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border border-indigo-100/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Workforce Score
            </span>
            <div className="flex items-center gap-0.5 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(data.overall_score)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-amber-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {data.overall_score}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">/ 5.0 rating</span>
          </div>
          <p className="text-[11px] text-indigo-900/70 mt-2 font-medium">
            Based on quarterly peer reviews, sprint deliverable metrics, and lead assessments.
          </p>
        </div>

        {/* KPI Delivery */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              KPI Completion Rate
            </span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {data.kpi_completion_rate}%
            </span>
            <span className="text-xs font-bold text-emerald-600 ml-2">+2.4% vs Q3</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${data.kpi_completion_rate}%` }}
            />
          </div>
        </div>

        {/* Punctuality Index */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              On-Time Punctuality
            </span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {data.punctuality_rate}%
            </span>
            <span className="text-xs font-bold text-indigo-600 ml-2">High Consistency</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${data.punctuality_rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Split: Rating Distribution & Department League */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Rating Tiers Distribution */}
        <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Evaluation Tier Distribution
            </h4>
            <span className="text-[11px] text-slate-400">Total Team</span>
          </div>

          <div className="space-y-3">
            {data.rating_distribution.map((tier, idx) => (
              <div key={tier.tier || idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    {tier.tier}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">{tier.count} staff</span>
                    <strong className="text-slate-800">{tier.percentage}%</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${tier.percentage}%`,
                      backgroundColor: tier.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>81.9% of all team members are rated in Top Achievement tiers.</span>
          </div>
        </div>

        {/* Department League Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Department Performance Matrix
            </h4>
            <span className="text-[11px] font-medium text-slate-400">Ranked by score</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
            {data.department_performance.map((dept, idx) => {
              const isSelected = selectedDept === dept.department;
              return (
                <div
                  key={dept.department}
                  onClick={() => setSelectedDept(isSelected ? null : dept.department)}
                  className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {dept.department}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Attendance: {dept.attendance_rate}%</span>
                        <span>•</span>
                        <span>KPI: {dept.kpi_rate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {dept.badge}
                    </span>
                    <span className="text-xs font-black text-slate-900 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {dept.avg_score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
