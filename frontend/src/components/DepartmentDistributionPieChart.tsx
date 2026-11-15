import React, { useState } from 'react';
import type { HRDepartmentDistribution } from '../api/types';
import { Users, PieChart as PieIcon, Info } from 'lucide-react';

interface Props {
  data: HRDepartmentDistribution[];
  totalEmployees: number;
}

export const DepartmentDistributionPieChart: React.FC<Props> = ({ data, totalEmployees }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If no data, render graceful fallback
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center justify-center min-h-[340px]">
        <Users className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-700">No Department Data</p>
        <p className="text-xs text-slate-400">Department distribution will appear once staff are assigned.</p>
      </div>
    );
  }

  // Geometry calculations
  const size = 300;
  const center = size / 2;
  const outerRadius = 122;
  const innerRadius = 76;
  const hoveredOuterRadius = 130;

  // Calculate cumulative angles
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock
  const totalCount = data.reduce((sum, item) => sum + item.count, 0) || totalEmployees || 1;

  const slices = data.map((item, index) => {
    const sliceAngle = (item.count / totalCount) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const isHovered = hoveredIndex === index;
    const currentOuterRadius = isHovered ? hoveredOuterRadius : outerRadius;

    // Outer arc coordinates
    const x1 = center + currentOuterRadius * Math.cos(startAngle);
    const y1 = center + currentOuterRadius * Math.sin(startAngle);
    const x2 = center + currentOuterRadius * Math.cos(endAngle);
    const y2 = center + currentOuterRadius * Math.sin(endAngle);

    // Inner arc coordinates
    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    // SVG path string for Donut slice
    const path = [
      `M ${x1} ${y1}`,
      `A ${currentOuterRadius} ${currentOuterRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      path,
      startAngle,
      endAngle,
      isHovered,
    };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Staff by Department</h3>
            <p className="text-[11px] text-slate-400">Headcount distribution across active departments</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>{totalCount} Total</span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-4">
        {/* SVG Donut */}
        <div className="md:col-span-6 flex justify-center items-center relative">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible drop-shadow-sm select-none"
          >
            <defs>
              <filter id="pie-slice-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Slices */}
            {slices.map((slice, index) => (
              <path
                key={slice.id || index}
                d={slice.path}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                filter={slice.isHovered ? 'url(#pie-slice-shadow)' : undefined}
                className="transition-all duration-200 cursor-pointer hover:opacity-95"
                style={{
                  transformOrigin: `${center}px ${center}px`,
                  transform: slice.isHovered ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* Center Donut Label */}
            <g
              className="pointer-events-none transition-all duration-300"
              transform={`translate(${center}, ${center})`}
            >
              <circle r={innerRadius - 4} fill="#FFFFFF" />
              {activeItem ? (
                <>
                  <text
                    textAnchor="middle"
                    y="-12"
                    className="fill-slate-400 text-[10px] font-semibold uppercase tracking-wider"
                  >
                    {activeItem.name.length > 14 ? activeItem.name.slice(0, 13) + '…' : activeItem.name}
                  </text>
                  <text
                    textAnchor="middle"
                    y="14"
                    className="fill-slate-900 text-2xl font-black tracking-tight"
                  >
                    {activeItem.count}
                  </text>
                  <text
                    textAnchor="middle"
                    y="30"
                    className="fill-indigo-600 text-[11px] font-bold"
                  >
                    {activeItem.percentage}% share
                  </text>
                </>
              ) : (
                <>
                  <text
                    textAnchor="middle"
                    y="-10"
                    className="fill-slate-400 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Total Headcount
                  </text>
                  <text
                    textAnchor="middle"
                    y="15"
                    className="fill-slate-900 text-2xl font-black tracking-tight"
                  >
                    {totalCount}
                  </text>
                  <text
                    textAnchor="middle"
                    y="30"
                    className="fill-slate-400 text-[10px] font-medium"
                  >
                    {data.length} Departments
                  </text>
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Legend / Breakdown List */}
        <div className="md:col-span-6 space-y-2.5">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={item.id || index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? 'bg-slate-50/90 border-slate-300 shadow-xs ring-1 ring-slate-200'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-bold text-slate-900">
                    {item.count} <span className="text-[10px] font-normal text-slate-400">staff</span>
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      color: item.color,
                      backgroundColor: `${item.color}14`,
                      borderColor: `${item.color}30`,
                    }}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info Pill */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Hover over pie slices or list items to isolate team shares.</span>
        </div>
        <span className="font-medium text-slate-600">Enterprise Workforce</span>
      </div>
    </div>
  );
};
