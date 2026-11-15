import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { NotificationItem } from '../api/types';
import {
  Bell,
  CheckCheck,
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications/');
      setNotifications(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await apiClient.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time alerts regarding leave approvals, status changes, and team schedules.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-indigo-600 bg-white hover:bg-slate-50 text-xs font-semibold shadow-xs transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">No notifications yet</p>
          <p className="text-xs text-slate-500 mt-1">
            You will be alerted whenever your requests are reviewed or team actions occur.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 sm:p-4.5 flex items-start gap-4 hover:bg-slate-50/70 cursor-pointer transition ${
                !n.is_read ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  !n.is_read
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-900 truncate">{n.title}</h3>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {new Date(n.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
