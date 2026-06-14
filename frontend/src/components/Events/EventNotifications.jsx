"use client";

import { useEffect, useState } from "react";
import { BellRing, Clock3, RefreshCw } from "lucide-react";
import { getUpcomingNotificationsWithinDays } from "@/firebase/notificationsService";

export default function EventNotifications({
  refreshKey = 0,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      setLoading(true);
      const notificationsFromDb = await getUpcomingNotificationsWithinDays(2);
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
    <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#D7E3D5] pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
            Stay prepared
          </p>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E]">
            Follow-up Reminders
          </h2>

          <p className="mt-2 text-sm text-[#60777B]">
            Upcoming reminders created for scheduled meetings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotifications}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#BFD0CA] bg-white px-4 py-2 text-sm font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#F3F7F1]"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-7 text-center">
          <p className="text-lg font-bold text-[#31585F]">
            Loading reminders...
          </p>

          <p className="mt-1 text-sm text-[#6A8589]">
            Fetching upcoming follow-up reminders
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2C6975] ring-1 ring-[#D7E3D5]">
            <BellRing aria-hidden="true" className="h-7 w-7" />
          </div>

          <p className="text-lg font-bold text-[#31585F]">
            No upcoming reminders
          </p>

          <p className="mt-1 text-sm text-[#6A8589]">
            Create a meeting and choose a reminder time to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isImportant = notification.priority === "high";
            const reminderDate = notification.scheduledFor
              ? new Date(notification.scheduledFor)
              : null;

            return (
              <article
                key={notification.id}
                className="rounded-2xl border border-[#D7E3D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F3_100%)] p-5 transition hover:border-[#9FBFB4] hover:shadow-[0_10px_24px_rgba(44,105,117,0.07)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6BB2A0]">
                      Follow-up Reminder
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-[#15383E]">
                      {notification.message || "Meeting reminder"}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isImportant
                        ? "bg-rose-100 text-rose-700"
                        : "bg-[#DCEAD6] text-[#2C6975]"
                    }`}
                  >
                    {isImportant ? "Important" : "Regular"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#D7E3D5]">
                    <p className="text-xs font-bold uppercase text-[#7C9194]">
                      Reminder timing
                    </p>

                    <p className="mt-1 font-bold text-[#31585F]">
                      {notification.reminderLabel || "Custom reminder"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#D7E3D5]">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#7C9194]">
                      <Clock3 aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                      Will be sent
                    </p>

                    <p className="mt-1 font-bold text-[#31585F]">
                      {reminderDate
                        ? reminderDate.toLocaleString()
                        : "Not scheduled"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#D7E3D5] pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7C9194]">
                    Reminder status
                  </p>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
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
