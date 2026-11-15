import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Users, GraduationCap, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        'Invalid email or password. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
          LF
        </div>
        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Sign in to LeaveFlow
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Enterprise Employee Attendance, Holidays & Leave Management System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-2xs rounded-2xl border border-slate-200/80 sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access for 4 Roles */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Role Login
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ems.local', 'AdminPass123!')}
                className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition text-center group"
              >
                <ShieldCheck className="w-4 h-4 text-slate-700 group-hover:text-indigo-600 mx-auto mb-1.5 transition" />
                <span className="block text-[11px] font-bold text-slate-900">Admin</span>
                <span className="text-[10px] text-slate-500">Depts & Holidays</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('hr@ems.local', 'HrPass123!')}
                className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 transition text-center group"
              >
                <UserCheck className="w-4 h-4 text-slate-700 group-hover:text-purple-600 mx-auto mb-1.5 transition" />
                <span className="block text-[11px] font-bold text-slate-900">HR Manager</span>
                <span className="text-[10px] text-slate-500">Onboarding & Quota</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('employee@ems.local', 'EmployeePass123!')}
                className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition text-center group"
              >
                <Users className="w-4 h-4 text-slate-700 group-hover:text-emerald-600 mx-auto mb-1.5 transition" />
                <span className="block text-[11px] font-bold text-slate-900">Employee</span>
                <span className="text-[10px] text-slate-500">Leave Balances</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('intern@ems.local', 'InternPass123!')}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition text-center group"
              >
                <GraduationCap className="w-4 h-4 text-slate-700 group-hover:text-amber-600 mx-auto mb-1.5 transition" />
                <span className="block text-[11px] font-bold text-slate-900">Intern</span>
                <span className="text-[10px] text-slate-500">Mentorship View</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
