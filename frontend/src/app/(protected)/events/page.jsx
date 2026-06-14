"use client";

import { useState } from "react";
import Script from "next/script";
import { BellRing, CalendarDays, Clock3 } from "lucide-react";

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
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#E5EFE0_0%,#F3F6F0_26%,#DDEAD8_100%)] px-4 py-5 text-[#15383E] sm:px-6 sm:py-7 lg:px-8">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        aria-hidden="true"
        className="absolute -right-36 top-24 -z-10 h-96 w-96 rounded-full border-[70px] border-[#BFD9C1]/60"
      />
      <div
        aria-hidden="true"
        className="absolute -left-40 top-[42rem] -z-10 h-96 w-96 rounded-full bg-[#C9DFC5]/70"
      />

      <div className="relative mx-auto max-w-7xl">
        <section className="mb-6 overflow-hidden rounded-[1.75rem] bg-[#2C6975] text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)]">
          <div className="grid lg:grid-cols-[1fr_auto]">
            <div className="relative overflow-hidden px-7 py-7 sm:px-10 sm:py-8 lg:px-11">
              <div
                aria-hidden="true"
                className="absolute -left-20 -top-24 h-72 w-72 rounded-full border-[48px] border-[#6BB2A0]/25"
              />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-10 bg-[#CDE0C9]" />
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DCEAD6]">
                    Community coordination
                  </p>
                </div>
                <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  Meetings & Follow-ups
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
                  Keep participant conversations, reminders, and next steps
                  organized in one calm, shared workspace.
                </p>
              </div>
            </div>

            <div className="grid border-t border-white/15 bg-[#245C66] sm:grid-cols-3 lg:w-80 lg:grid-cols-1 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-3 px-5 py-3.5 sm:justify-center lg:justify-start lg:border-b lg:border-white/10">
                <CalendarDays className="h-5 w-5 text-[#CDE0C9]" />
                <span className="text-sm font-semibold">Plan meetings</span>
              </div>
              <div className="flex items-center gap-3 border-t border-white/10 px-5 py-3.5 sm:border-l sm:border-t-0 sm:justify-center lg:justify-start lg:border-b lg:border-l-0">
                <BellRing className="h-5 w-5 text-[#CDE0C9]" />
                <span className="text-sm font-semibold">Track reminders</span>
              </div>
              <div className="flex items-center gap-3 border-t border-white/10 px-5 py-3.5 sm:border-l sm:border-t-0 sm:justify-center lg:justify-start lg:border-l-0">
                <Clock3 className="h-5 w-5 text-[#CDE0C9]" />
                <span className="text-sm font-semibold">Stay connected</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ScheduleMeetingForm
            onMeetingCreated={handleMeetingCreated}
          />

          <EventList
            refreshKey={refreshKey}
            onDataChanged={handleMeetingCreated}
          />

          <div className="md:col-span-2 xl:col-span-1">
            <EventNotifications refreshKey={refreshKey} />
          </div>
        </section>

        <EventCalendar refreshKey={refreshKey} />
      </div>
    </main>
  );
}
