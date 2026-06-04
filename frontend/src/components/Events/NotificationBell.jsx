"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/firebase/notificationsService";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  async function loadNotifications() {
    try {
      const notificationsFromDb = await getNotifications();
      setNotifications(notificationsFromDb);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 60000);
  
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);
  
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        🔔

        {notifications.length > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
          <h3 className="mb-3 text-sm font-black text-slate-900">
            Upcoming Reminders
          </h3>

          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming reminders.</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl bg-slate-50 p-3"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {notification.message || "Meeting reminder"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {notification.scheduledFor
                      ? new Date(notification.scheduledFor).toLocaleString()
                      : "No time set"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}