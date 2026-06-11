"use client";

import { useEffect, useState } from "react";
import {
  getDueNotifications,
  updateNotificationById,
} from "@/firebase/notificationsService";
import { getEventById } from "@/firebase/eventsService";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  async function loadNotifications() {
    try {
      const due = await getDueNotifications();

      if (!due || due.length === 0) {
        setNotifications([]);
        return;
      }

      // Resolve related events in parallel (small set expected)
      const uniqueEventIds = [...new Set(due.map((n) => n.eventId).filter(Boolean))];
      const eventsById = {};

      await Promise.all(
        uniqueEventIds.map(async (id) => {
          const ev = await getEventById(id);
          eventsById[id] = ev;
        }),
      );

      const now = new Date();

      const actionable = due.filter((notification) => {
        const ev = eventsById[notification.eventId];

        if (!ev) return false;
        if (ev.status !== "scheduled") return false;
        if (!ev.date || !ev.time) return false;

        const eventDateTime = new Date(`${ev.date}T${ev.time}`);
        if (Number.isNaN(eventDateTime.getTime())) return false;

        // only show reminders for meetings that have not yet passed
        if (eventDateTime < now) return false;

        return true;
      });

      setNotifications(actionable);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    }
  }

  async function handleDismiss(e, notificationId) {
    e.stopPropagation();

    // Optimistic UI: remove locally first
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

    try {
      await updateNotificationById(notificationId, {
        status: "dismissed",
        dismissedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to dismiss notification", err);
      // restore from server on failure
      await loadNotifications();
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 30000);
  
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
        onClick={async () => {
          if (!isOpen) await loadNotifications();
          setIsOpen((current) => !current);
        }}
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {notification.message || "Meeting reminder"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {notification.scheduledFor
                          ? new Date(notification.scheduledFor).toLocaleString()
                          : "No time set"}
                      </p>
                    </div>

                    <div className="ml-4 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(e, notification.id)}
                        aria-label="Dismiss reminder"
                        className="rounded-full bg-transparent px-2 py-1 text-sm font-bold text-slate-500 hover:text-slate-800"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}