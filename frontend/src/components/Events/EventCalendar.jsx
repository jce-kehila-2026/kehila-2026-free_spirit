"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getEvents } from "@/firebase/eventsService";


export default function EventCalendar({ refreshKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const ev = await getEvents();
      setEvents(ev || []);
    } catch (err) {
      console.error("Failed to load calendar events", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  // Defer the initial load so state updates do not run synchronously inside the effect body.
  const initialLoadId = window.setTimeout(() => {
    load();
  }, 0);

  const refreshIntervalId = window.setInterval(load, 60000);

  return () => {
    window.clearTimeout(initialLoadId);
    window.clearInterval(refreshIntervalId);
  };
}, [refreshKey]);

  // Map Firestore events to FullCalendar events
  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const durationMin = Number(e.durationMinutes) || 60;

      const start = e.date && e.time ? `${e.date}T${e.time}` : undefined;

      let end;
      if (start) {
        const st = new Date(start);
        const en = new Date(st.getTime() + durationMin * 60000);
        end = en.toISOString();
      }

      return {
        id: e.id,
        title: e.title || "Meeting",
        start,
        end,
        extendedProps: {
          clientName: e.clientName,
          priority: e.priority,
          notes: e.notes,
          originalEvent: e,
        },
      };
    });
  }, [events]);

  function renderEventContent(arg) {
    const { event } = arg;
    const start = event.start;
    const timeText = start
      ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    return (
      <div className="fc-event-content">
        <div className="text-xs font-semibold">{timeText} — {event.title}</div>
        {event.extendedProps.clientName && (
          <div className="text-[11px] text-slate-500">{event.extendedProps.clientName}</div>
        )}
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-slate-950">System Calendar</h2>
        <p className="mt-1 text-sm text-slate-500">View all upcoming scheduled meetings by month, week, or day.</p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-bold text-slate-700">Loading calendar...</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            events={fcEvents}
            eventContent={renderEventContent}
            eventClick={(clickInfo) => {
              clickInfo.jsEvent?.preventDefault();

              const original = clickInfo.event?.extendedProps?.originalEvent;
              if (original) setSelectedEvent(original);
            }}
            selectable={false}
            editable={false}
            nowIndicator={true}
          />
        </div>
      )}

      {/* Event details modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Event details"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedEvent.title || "Meeting"}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedEvent.clientName || ""}</p>
              </div>

              <button
                className="ml-4 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {selectedEvent.date && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Date</div>
                  <div className="text-sm text-slate-800">{selectedEvent.date}</div>
                </div>
              )}

              {selectedEvent.time && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Time</div>
                  <div className="text-sm text-slate-800">{selectedEvent.time}</div>
                </div>
              )}

              {selectedEvent.durationMinutes && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Duration</div>
                  <div className="text-sm text-slate-800">{selectedEvent.durationMinutes} minutes</div>
                </div>
              )}

              {selectedEvent.priority && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Priority</div>
                  <div className="text-sm text-slate-800">{selectedEvent.priority}</div>
                </div>
              )}

              {selectedEvent.reminderLabel && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Reminder</div>
                  <div className="text-sm text-slate-800">{selectedEvent.reminderLabel}</div>
                </div>
              )}

              {selectedEvent.reminderOption && !selectedEvent.reminderLabel && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Reminder</div>
                  <div className="text-sm text-slate-800">{selectedEvent.reminderOption}</div>
                </div>
              )}

              {selectedEvent.calendarSyncLabel && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Calendar Sync</div>
                  <div className="text-sm text-slate-800">{selectedEvent.calendarSyncLabel}</div>
                </div>
              )}

              {selectedEvent.googleCalendarLink && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Google Calendar</div>
                  <div className="text-sm text-slate-800">
                    <a
                      href={selectedEvent.googleCalendarLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open in Google Calendar
                    </a>
                  </div>
                </div>
              )}
            </div>

            {selectedEvent.notes && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500">Notes</div>
                <div className="mt-1 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">
                  {selectedEvent.notes}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
