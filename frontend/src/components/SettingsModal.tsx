import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  X,
  Lock,
  Camera,
  Bell,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Shield,
  Smartphone,
  HeartHandshake,
  MapPin,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'PASSWORD' | 'PROFILE' | 'PREFERENCES';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'PASSWORD',
}) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'PASSWORD' | 'PROFILE' | 'PREFERENCES'>(defaultTab);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile details state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Preferences state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [leaveReminders, setLeaveReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhoneNumber(user.profile?.phone_number || '');
      setAddress(user.profile?.address || '');
      setEmergencyContact(user.profile?.emergency_contact || '');

      const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      setPasswordLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPasswordSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update password. Please check your current password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await apiClient.patch('/employees/me/', {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        address: address,
        emergency_contact: emergencyContact,
      });

      if (selectedAvatar) {
        localStorage.setItem(`avatar_${user.id}`, selectedAvatar);
      }

      await refreshUser();
      setProfileSuccess('Profile information and avatar updated successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile information.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
    localStorage.setItem(`avatar_${user.id}`, url);
    setProfileSuccess('Avatar chosen! Remember to save profile changes.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setProfileError('Image size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedAvatar(base64String);
        localStorage.setItem(`avatar_${user.id}`, base64String);
        setProfileSuccess('Custom photo uploaded! Remember to save profile changes.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">User Account & Security Settings</h2>
              <p className="text-[11px] text-slate-400">Manage credentials, avatar images, and notification channels</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-100 flex gap-4 bg-white">
          <button
            onClick={() => setActiveTab('PASSWORD')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'PASSWORD'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'PROFILE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Profile Photo & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'PREFERENCES'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: CHANGE PASSWORD */}
          {activeTab === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900/80 leading-relaxed">
                <span className="font-bold text-indigo-950 block mb-0.5">Password Security Guidelines:</span>
                Create a strong password with at least 8 characters, including upper and lower case letters, numbers, and symbols.
              </div>

              {passwordSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PROFILE PHOTO & DETAILS */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Avatar Chooser & Upload */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {selectedAvatar ? (
                      <img
                        src={selectedAvatar}
                        alt="User Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                        {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-xs hover:bg-indigo-700 transition"
                      title="Upload custom image"
                    >
                      <Camera className="w-3 h-3" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Profile Image & Avatar</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose an avatar below or click the camera icon to upload a photo (Max 2MB).
                    </p>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Avatars
                  </span>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Avatar ${idx + 1}`}
                        onClick={() => handleAvatarSelect(av)}
                        className={`w-9 h-9 rounded-xl object-cover cursor-pointer border-2 transition ${
                          selectedAvatar === av
                            ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105'
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Direct Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Emergency Contact
                  </label>
                  <div className="relative">
                    <HeartHandshake className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. Jane Doe (Spouse) / +1..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, State, Postal Code"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {profileLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'PREFERENCES' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Email Notification Digests</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Receive email updates when leave requests are approved or rejected.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Attendance Punch Reminder</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gentle reminder notification at 9:00 AM on scheduled work days.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={leaveReminders}
                  onChange={(e) => setLeaveReminders(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Audio Feedback Chimes</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Subtle chime sound on successful check-in and check-out.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
