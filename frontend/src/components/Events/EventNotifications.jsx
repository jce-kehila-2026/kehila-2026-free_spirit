// Responsible for: showing reminders/notification, later maybe notification bell dropdown

"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/firebase/notificationsService";

export default function EventNotifications() {
  const [notifications, setNotifications] = useState([]);

  async function loadNotifications() {
    try {
      const notificationsFromDb = await getNotifications();
      setNotifications(notificationsFromDb);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);
  
    return () => clearTimeout(timer);
  }, []);
  return (
    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-950">
          Automatic Notifications
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Reminder records created automatically when meetings are scheduled.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    🔔 {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Type: {notification.type}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    notification.priority === "high"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {notification.priority}
                </span>
              </div>

              <p className="mt-3 text-xs font-bold uppercase text-slate-400">
                Status: {notification.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
