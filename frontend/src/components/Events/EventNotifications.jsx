"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/firebase/notificationsService";

export default function EventNotifications({
  refreshKey = 0,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      setLoading(true);
      const notificationsFromDb = await getNotifications();
      setNotifications(notificationsFromDb);
    } catch (error) {
      console.error(error);
      alert("Failed to load reminders.");
    } finally {
      setLoading(false);
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
  }, [refreshKey]);

  return (
    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Follow-up Reminders
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upcoming reminders created for scheduled meetings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotifications}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-bold text-slate-700">
            Loading reminders...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Fetching upcoming follow-up reminders
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🔔
          </div>

          <p className="text-lg font-bold text-slate-800">
            No upcoming reminders
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Create a meeting and choose a reminder time to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const isImportant = notification.priority === "high";
            const reminderDate = notification.scheduledFor
              ? new Date(notification.scheduledFor)
              : null;

            return (
              <article
                key={notification.id}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                      Follow-up Reminder
                    </p>

                    <h3 className="mt-2 text-lg font-black text-slate-950">
                      {notification.message || "Meeting reminder"}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      isImportant
                        ? "bg-rose-100 text-rose-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isImportant ? "Important" : "Regular"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Reminder timing
                    </p>

                    <p className="mt-1 font-bold text-slate-800">
                      {notification.reminderLabel || "Custom reminder"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Will be sent
                    </p>

                    <p className="mt-1 font-bold text-slate-800">
                      {reminderDate
                        ? reminderDate.toLocaleString()
                        : "Not scheduled"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Reminder status
                  </p>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                    {notification.statusLabel || "Waiting to be sent"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}