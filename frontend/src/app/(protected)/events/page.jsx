"use client";

import { useState } from "react";
import Script from "next/script";

import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm";
import EventList from "@/components/Events/EventList";
import EventNotifications from "@/components/Events/EventNotifications";
import EventCalendar from "@/components/Events/EventCalendar";

export default function EventsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMeetingCreated = () => {
    setRefreshKey((current) => current + 1);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_35%),linear-gradient(135deg,_#f8fafc,_#eef2ff)] px-6 py-8">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-9 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Free Spirit Association
              </p>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Meetings & Follow-ups
              </h1>

              <p className="mt-4 max-w-2xl text-base text-slate-300">
                Schedule participant meetings, track reminders, and manage important follow-ups.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <ScheduleMeetingForm
            onMeetingCreated={handleMeetingCreated}
          />

          <EventList
            refreshKey={refreshKey}
            onDataChanged={handleMeetingCreated}
          />
        </section>

        <EventNotifications refreshKey={refreshKey} />
        <EventCalendar refreshKey={refreshKey} />
      </div>
    </main>
  );
}