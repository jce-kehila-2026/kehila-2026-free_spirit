"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  CalendarDays,
  CalendarSync,
  Check,
  Clock3,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { getCalendarEvents, updateEvent } from "@/firebase/eventsService";
import useEventActions from "@/hooks/useEventActions";

import ScheduleMeetingForm from "./ScheduleMeetingForm";

// Local mapping for preset reminder labels (kept minimal and stable)
const PRESET_REMINDER_LABELS = {
  half_hour_before: "30 minutes before",
  two_hours_before: "2 hours before",
  one_day_before: "1 day before",
  three_days_before: "3 days before",
  one_week_before: "1 week before",
  event_time: "At meeting time",
};

function formatCustomReminder(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function getReminderDisplay(e) {
  if (!e || e.addReminder === false) return null;

  // Prefer explicitly stored reminderLabel
  if (e.reminderLabel) return e.reminderLabel;

  // Custom reminder
  if (e.reminderMode === "custom") {
    const formatted = formatCustomReminder(e.customReminderDate, e.customReminderTime);
    return formatted ? `Custom reminder — ${formatted}` : null;
  }

  // Preset reminder
  if (e.reminderOption) {
    return PRESET_REMINDER_LABELS[e.reminderOption] || e.reminderOption;
  }

  return null;
}


export default function EventCalendar({ refreshKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditingSelectedEvent, setIsEditingSelectedEvent] = useState(false);
  const [isEditingMeetingSummary, setIsEditingMeetingSummary] = useState(false);
  const [meetingSummaryDraft, setMeetingSummaryDraft] = useState("");
  const [isSavingMeetingSummary, setIsSavingMeetingSummary] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const ev = await getCalendarEvents();
      setEvents(ev || []);
    } catch (err) {
      console.error("Failed to load calendar events", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const {
    actionLoadingId,
    handleComplete,
    handleCancel,
    handleDelete,
  } = useEventActions({ onRefresh: load });

  const isSelectedEventActionLoading =
    Boolean(selectedEvent?.id) && actionLoadingId === selectedEvent.id;
  const isSelectedEventModalBusy =
    isSelectedEventActionLoading || isSavingMeetingSummary;

  function resetMeetingSummaryEditor() {
    setIsEditingMeetingSummary(false);
    setMeetingSummaryDraft("");
  }

  function closeSelectedEventModal() {
    if (isSelectedEventModalBusy) return;

    resetMeetingSummaryEditor();
    setIsEditingSelectedEvent(false);
    setSelectedEvent(null);
  }

  function handleStartSelectedEventEdit() {
    resetMeetingSummaryEditor();
    setIsEditingSelectedEvent(true);
  }

  function handleStartMeetingSummaryEdit() {
    setMeetingSummaryDraft(selectedEvent?.meetingSummary || "");
    setIsEditingMeetingSummary(true);
  }

  function handleCancelMeetingSummaryEdit() {
    if (isSavingMeetingSummary) return;

    setMeetingSummaryDraft("");
    setIsEditingMeetingSummary(false);
  }

  async function handleSaveMeetingSummary() {
    const trimmedValue = meetingSummaryDraft.trim();

    try {
      setIsSavingMeetingSummary(true);
      await updateEvent(selectedEvent.id, { meetingSummary: trimmedValue });

      setSelectedEvent((currentEvent) =>
        currentEvent?.id === selectedEvent.id
          ? { ...currentEvent, meetingSummary: trimmedValue }
          : currentEvent,
      );
      setMeetingSummaryDraft("");
      setIsEditingMeetingSummary(false);
      await load();
    } catch (error) {
      console.error(error);
      alert("Failed to save meeting summary.");
    } finally {
      setIsSavingMeetingSummary(false);
    }
  }

  async function handleSelectedEventComplete() {
    try {
      await handleComplete(selectedEvent.id);
      setSelectedEvent(null);
    } catch (error) {
      console.error(error);
      alert("Failed to complete meeting.");
    }
  }

  async function handleSelectedEventCancel() {
    try {
      await handleCancel(selectedEvent);
      setSelectedEvent(null);
    } catch (error) {
      console.error(error);
      alert("Failed to cancel meeting.");
    }
  }

  async function handleSelectedEventDelete() {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this meeting?",
    );

    if (!shouldDelete) return;

    try {
      await handleDelete(selectedEvent);
      setSelectedEvent(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete meeting.");
    }
  }

  async function handleSelectedEventEditCompleted() {
    await load();
    resetMeetingSummaryEditor();
    setIsEditingSelectedEvent(false);
    setSelectedEvent(null);
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
        classNames: [`calendar-event--${e.status}`],
        extendedProps: {
          clientName: e.clientName,
          priority: e.priority,
          notes: e.notes,
          status: e.status,
          originalEvent: e,
        },
      };
    });
  }, [events]);

  function renderEventContent(arg) {
    const { event } = arg;
    const start = event.start;
    const status = event.extendedProps.status;
    const timeText = start
      ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    return (
      <div className="fc-event-content min-w-0">
        <div className="fc-event-title-line truncate text-xs font-bold">{timeText} — {event.title}</div>
        {event.extendedProps.clientName && (
          <div className="truncate text-[11px] text-current opacity-75">{event.extendedProps.clientName}</div>
        )}
        {status !== "scheduled" && (
          <div className="fc-event-status-label text-[10px] font-bold uppercase tracking-wide">
            {status}
          </div>
        )}
      </div>
    );
  }
  return (
    <section className="events-calendar mt-2 rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_14px_34px_rgba(44,105,117,0.08)] sm:p-6">
      <div className="mb-6 flex items-start gap-4 border-b border-[#D7E3D5] pb-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C6975] text-white">
          <CalendarDays aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#6BB2A0]">System Calendar</h2>
          <p className="mt-2 text-sm text-[#60777B]">View all upcoming scheduled meetings by month, week, or day.</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-8 text-center">
          <p className="text-lg font-bold text-[#31585F]">Loading calendar...</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-[#D7E3D5] bg-white p-2 sm:p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            views={{
              dayGridMonth: {
                dayMaxEvents: 3,
                moreLinkClick: "timeGridDay",
              },
            }}
            height="auto"
            events={fcEvents}
            eventContent={renderEventContent}
            dateClick={(clickInfo) => {
              if (clickInfo.view.type === "dayGridMonth") {
                clickInfo.view.calendar.changeView("timeGridDay", clickInfo.date);
              }
            }}
            eventClick={(clickInfo) => {
              clickInfo.jsEvent?.preventDefault();

              const original = clickInfo.event?.extendedProps?.originalEvent;
              if (original) {
                resetMeetingSummaryEditor();
                setIsEditingSelectedEvent(false);
                setSelectedEvent(original);
              }
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm"
          onClick={closeSelectedEventModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.24)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isEditingSelectedEvent ? "Edit meeting" : "Event details"}
          >
            <div className="flex items-start justify-between bg-[#2C6975] px-6 py-5 text-white">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#CDE0C9]">
                  {isEditingSelectedEvent ? "Meeting workspace" : "Meeting details"}
                </p>
                <h3 className="truncate text-xl font-bold">
                  {isEditingSelectedEvent
                    ? "Edit Meeting"
                    : selectedEvent.title || "Meeting"}
                </h3>
                {!isEditingSelectedEvent && (
                  <p className="mt-1 text-sm text-white/72">
                    {selectedEvent.clientName || ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeSelectedEventModal}
                disabled={isSelectedEventModalBusy}
                aria-label="Close"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {isEditingSelectedEvent ? (
              <div className="p-4 sm:p-6">
                <ScheduleMeetingForm
                  initialData={selectedEvent}
                  isEditMode={true}
                  onEditCompleted={handleSelectedEventEditCompleted}
                  onClose={closeSelectedEventModal}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-3 px-6 pt-6 sm:grid-cols-2">
                  {selectedEvent.date && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6A8589]">
                        <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                        Date
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.date}</div>
                    </div>
                  )}

                  {selectedEvent.time && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6A8589]">
                        <Clock3 aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                        Time
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.time}</div>
                    </div>
                  )}

                  {selectedEvent.durationMinutes && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Duration</div>
                      <div className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.durationMinutes} minutes</div>
                    </div>
                  )}

                  {selectedEvent.priority && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Priority</div>
                      <div className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.priority}</div>
                    </div>
                  )}

                  {(() => {
                    const reminderDisplay = getReminderDisplay(selectedEvent);
                    return (
                      reminderDisplay && (
                        <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Reminder</div>
                          <div className="mt-1 text-sm font-semibold text-[#31585F]">{reminderDisplay}</div>
                        </div>
                      )
                    );
                  })()}

                  {selectedEvent.calendarSyncLabel && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6A8589]">
                        <CalendarSync aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                        Calendar Sync
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.calendarSyncLabel}</div>
                    </div>
                  )}

                  {selectedEvent.googleCalendarLink && (
                    <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Google Calendar</div>
                      <div className="mt-1 text-sm text-[#31585F]">
                        <a
                          href={selectedEvent.googleCalendarLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#2C6975] hover:underline"
                        >
                          Open in Google Calendar
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.notes && (
                  <div className="px-6 pt-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Notes</div>
                    <div className="mt-2 rounded-2xl border border-[#C9D9D1] bg-[#EAF2EA] p-4 text-sm leading-6 text-[#31585F]">
                      {selectedEvent.notes}
                    </div>
                  </div>
                )}

                <div className="px-6 pt-4">
                  <div className="rounded-2xl border border-[#C9D9D1] bg-[#F3F7F1] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">
                        Meeting summary
                      </div>
                      {!isEditingMeetingSummary && (
                        <button
                          type="button"
                          className="rounded-full border border-[#BFD0CA] bg-white px-3 py-1.5 text-xs font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#EAF2EA] disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={handleStartMeetingSummaryEdit}
                          disabled={isSelectedEventModalBusy}
                        >
                          {selectedEvent.meetingSummary?.trim()
                            ? "Edit summary"
                            : "Add summary"}
                        </button>
                      )}
                    </div>

                    {isEditingMeetingSummary ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={meetingSummaryDraft}
                          onChange={(event) => setMeetingSummaryDraft(event.target.value)}
                          disabled={isSavingMeetingSummary}
                          className="min-h-28 w-full resize-y rounded-xl border border-[#BFD0CA] bg-white px-4 py-3 text-sm leading-6 text-[#31585F] outline-none transition placeholder:text-[#829497] focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                          placeholder="Add outcomes, decisions, or follow-up details..."
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-[#BFD0CA] bg-white px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={handleCancelMeetingSummaryEdit}
                            disabled={isSavingMeetingSummary}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-[#2C6975] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={handleSaveMeetingSummary}
                            disabled={isSavingMeetingSummary}
                          >
                            {isSavingMeetingSummary ? "Saving..." : "Save summary"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#31585F]">
                        {selectedEvent.meetingSummary?.trim() || "No summary added yet."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[#D7E3D5] px-6 py-4">
                  {selectedEvent.status === "scheduled" && (
                    <>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full bg-[#2C6975] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleStartSelectedEventEdit}
                        disabled={isSelectedEventModalBusy}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full bg-[#4F8B75] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3F7763] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSelectedEventComplete}
                        disabled={isSelectedEventModalBusy}
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                        Complete
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[#D6C898] bg-[#FFF8DF] px-4 py-2.5 text-sm font-bold text-[#80691B] transition hover:bg-[#F8EDC7] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSelectedEventCancel}
                        disabled={isSelectedEventModalBusy}
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        Cancel
                      </button>
                    </>
                  )}

                  {selectedEvent.status !== "deleted" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleSelectedEventDelete}
                      disabled={isSelectedEventModalBusy}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded-full bg-[#2C6975] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={closeSelectedEventModal}
                    disabled={isSelectedEventModalBusy}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
        .events-calendar .fc {
          --fc-border-color: #d7e3d5;
          --fc-button-bg-color: #2c6975;
          --fc-button-border-color: #2c6975;
          --fc-button-hover-bg-color: #245c66;
          --fc-button-hover-border-color: #245c66;
          --fc-button-active-bg-color: #1f555e;
          --fc-button-active-border-color: #1f555e;
          --fc-today-bg-color: #e8f2e5;
          --fc-neutral-bg-color: #f7faf5;
          --fc-page-bg-color: #ffffff;
          --fc-event-bg-color: #4f8b75;
          --fc-event-border-color: #3f7763;
          --fc-event-text-color: #ffffff;
          color: #31585f;
          font-size: 0.875rem;
        }

        .events-calendar .fc .fc-toolbar {
          gap: 0.75rem;
          margin-bottom: 1.15rem;
        }

        .events-calendar .fc .fc-toolbar-title {
          color: #15383e;
          font-size: 1.15rem;
          font-weight: 700;
        }

        .events-calendar .fc .fc-button {
          border-radius: 9999px;
          box-shadow: none;
          font-weight: 700;
          padding: 0.5rem 0.8rem;
          text-transform: capitalize;
          transition:
            background-color 160ms ease,
            border-color 160ms ease,
            transform 160ms ease;
        }

        .events-calendar .fc .fc-button:hover {
          transform: translateY(-1px);
        }

        .events-calendar .fc .fc-button:focus-visible {
          box-shadow: 0 0 0 3px #cde0c9;
          outline: none;
        }

        .events-calendar .fc .fc-button-primary:not(:disabled).fc-button-active {
          background: #dcead6;
          border-color: #b9cfc4;
          color: #245c66;
        }

        .events-calendar .fc .fc-col-header-cell-cushion,
        .events-calendar .fc .fc-daygrid-day-number {
          color: #31585f;
          font-weight: 700;
          padding: 0.55rem;
        }

        .events-calendar .fc .fc-col-header-cell {
          background: #f3f7f1;
        }

        .events-calendar .fc .fc-daygrid-day {
          transition: background-color 140ms ease;
        }

        .events-calendar .fc .fc-daygrid-day:hover {
          background: #f3f8f1;
        }

        .events-calendar .fc .fc-day-today .fc-daygrid-day-number {
          align-items: center;
          background: #2c6975;
          border-radius: 9999px;
          color: #ffffff;
          display: inline-flex;
          height: 2rem;
          justify-content: center;
          margin: 0.25rem;
          padding: 0;
          width: 2rem;
        }

        .events-calendar .fc .fc-event {
          border-radius: 0.7rem;
          box-shadow: 0 3px 8px rgba(44, 105, 117, 0.14);
          cursor: pointer;
          margin: 0.1rem 0.2rem;
          padding: 0.28rem 0.4rem;
          transition:
            filter 140ms ease,
            transform 140ms ease;
        }

        .events-calendar .fc .fc-event.calendar-event--completed {
          background-color: #7a9d8f;
          border-color: #688b7e;
          box-shadow: 0 2px 6px rgba(68, 105, 91, 0.12);
          color: #f7fbf8;
        }

        .events-calendar .fc .fc-event.calendar-event--cancelled {
          background-color: #9ba7a6;
          border-color: #879493;
          box-shadow: none;
          color: #f7f8f8;
          opacity: 0.72;
        }

        .events-calendar .fc .calendar-event--cancelled .fc-event-title-line {
          text-decoration: line-through;
          text-decoration-thickness: 1.5px;
        }

        .events-calendar .fc .fc-event-status-label {
          margin-top: 0.1rem;
          opacity: 0.85;
        }

        .events-calendar .fc .fc-event:hover {          filter: brightness(0.94);
          transform: translateY(-1px);
        }

        .events-calendar .fc .fc-event:focus {
          box-shadow: 0 0 0 3px #cde0c9;
          outline: none;
        }

        .events-calendar .fc .fc-timegrid-now-indicator-line {
          border-color: #2c6975;
          border-width: 2px;
        }

        .events-calendar .fc .fc-timegrid-now-indicator-arrow {
          border-color: #2c6975;
          border-bottom-color: transparent;
          border-top-color: transparent;
        }

        @media (max-width: 640px) {
          .events-calendar .fc .fc-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .events-calendar .fc .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
