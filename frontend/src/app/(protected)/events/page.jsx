"use client";

import { useState } from "react";
import Script from "next/script";

import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm";
import EventCalendar from "@/components/Events/EventCalendar";
import MeetingRepository from "@/components/Events/MeetingRepository";

export default function EventsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [activeView, setActiveView] = useState("calendar");

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

            <div className="flex items-center justify-center border-t border-white/15 bg-[#245C66] lg:w-80 lg:border-l lg:border-t-0">
              <div className="w-full px-6 py-6">
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowCreateMeetingModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-[#15383E] shadow-sm hover:brightness-95"
                  >
                    + Add new meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <nav
          aria-label="Events views"
          className="mt-6 rounded-2xl border border-white/80 bg-[#FFFDF8] p-2 shadow-[0_10px_25px_rgba(44,105,117,0.06)]"
        >
          <div role="tablist" className="grid grid-cols-2 gap-2 sm:inline-grid sm:min-w-80">
            {[
              { id: "calendar", label: "Calendar" },
              { id: "meetings", label: "Meetings" },
            ].map((view) => {
              const isActive = activeView === view.id;

              return (
                <button
                  key={view.id}
                  id={`events-tab-${view.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="events-view-panel"
                  onClick={() => setActiveView(view.id)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] ${
                    isActive
                      ? "bg-[#DCEBEF] text-[#245C66] ring-1 ring-[#C9DDE1]"
                      : "text-[#607B80] hover:bg-[#EEF4EC] hover:text-[#31585F]"
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section
          id="events-view-panel"
          role="tabpanel"
          aria-labelledby={`events-tab-${activeView}`}
          className="mt-4"
        >
          <div className="rounded-[1.25rem] bg-white/0 p-2">
            {activeView === "calendar" ? (
              <EventCalendar refreshKey={refreshKey} />
            ) : (
              <MeetingRepository refreshKey={refreshKey} />
            )}
          </div>
        </section>

        {/* Create meeting modal/drawer (Phase 1: modal) */}
        {showCreateMeetingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm" onClick={() => setShowCreateMeetingModal(false)}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/60 bg-[#E7F0E2] p-4 shadow-[0_24px_60px_rgba(21,56,62,0.24)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create meeting">
              <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#2C6975] px-4 py-3 text-white">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#CDE0C9]">Meeting workspace</p>
                  <h3 className="mt-0.5 text-lg font-bold">Create Meeting</h3>
                </div>

                <button type="button" onClick={() => setShowCreateMeetingModal(false)} aria-label="Close create meeting" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">×</button>
              </div>

              <ScheduleMeetingForm
                onMeetingCreated={() => {
                  handleMeetingCreated();
                  setShowCreateMeetingModal(false);
                }}
                onClose={() => setShowCreateMeetingModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
