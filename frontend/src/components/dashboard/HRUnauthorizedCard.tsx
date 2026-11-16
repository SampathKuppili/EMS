import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  CalendarPlus,
  Clock,
  WalletCards,
} from 'lucide-react';

interface HRUnauthorizedCardProps {
  userRole?: string;
}

export const HRUnauthorizedCard: React.FC<HRUnauthorizedCardProps> = ({ userRole = 'EMPLOYEE' }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto text-center space-y-5 my-8">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Executive HR & Workforce Analytics View Restricted
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          This portal overview is reserved for Human Resources personnel and System Administrators. Your role (<strong className="text-slate-700">{userRole}</strong>) grants access to employee self-service features.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Apply for Leave</span>
        </Link>

        <Link
          to="/attendance"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>My Attendance</span>
        </Link>

        <Link
          to="/balances"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <WalletCards className="w-3.5 h-3.5 text-slate-400" />
          <span>Leave Balances</span>
        </Link>
      </div>
    </div>
  );
};
