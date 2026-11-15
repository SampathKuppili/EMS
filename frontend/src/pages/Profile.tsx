import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  X,
  BadgeInfo,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhoneNumber(user.profile?.phone_number || '');
      setAddress(user.profile?.address || '');
      setEmergencyContact(user.profile?.emergency_contact || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await apiClient.patch('/employees/me/', {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        address: address,
        emergency_contact: emergencyContact,
      });
      await refreshUser();
      setSuccessMsg('Your profile contact details have been successfully updated.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile information.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials =
    user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : user.email[0].toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account & Employee Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your organizational hierarchy, corporate role, and personal emergency contacts.
          </p>
        </div>
      </div>

      {/* Action Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-emerald-950">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl tracking-tight shadow-xs shrink-0">
          {initials}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">{user.full_name}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                user.role === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : user.role === 'MANAGER'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {user.role}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Member
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {user.profile?.department_name || 'General Department'}
            </span>
            <span className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
              ID: {user.profile?.employee_code || `EMP-${user.id.toString().padStart(4, '0')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Organizational Structure Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Employment Details
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Department
              </span>
              <p className="mt-1 text-xs text-slate-800 font-semibold flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {user.profile?.department_name || 'Unassigned'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Job Designation
              </span>
              <p className="mt-1 text-xs text-slate-800 font-semibold flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {user.profile?.designation || 'Staff Associate'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Reporting Manager
              </span>
              <div className="mt-1 text-xs text-slate-800 font-semibold">
                <p className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {user.profile?.manager_name || 'Direct Executive Report'}
                </p>
                {user.profile?.manager_email && (
                  <p className="text-[11px] text-slate-500 font-normal pl-5.5 mt-0.5">
                    {user.profile.manager_email}
                  </p>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Official Joining Date
              </span>
              <p className="mt-1 text-xs text-slate-800 font-semibold flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {user.profile?.joining_date
                  ? new Date(user.profile.joining_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Recorded upon onboarding'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
            <BadgeInfo className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Organizational hierarchy, reporting lines, and employee IDs are managed centrally by HR Administration.
            </p>
          </div>
        </div>

        {/* Right: Personal & Contact Form Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Personal & Emergency Contact Information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your direct phone contact and urgent notification channels.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Direct Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Emergency Contact
                </label>
                <div className="relative">
                  <HeartHandshake className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Name & Relationship (e.g. Spouse / +1...)"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Residential Address
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  placeholder="Street address, Suite / Apt, City, State, Postal Code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Contact Info
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Change Password Card */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Account Security & Password
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Regularly update your login credentials to protect your employee account and time-off records.
            </p>

            <ProfilePasswordSection />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfilePasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-type new password"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
};

