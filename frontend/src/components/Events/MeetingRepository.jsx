"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarSync,
  Clock3,
  ExternalLink,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { getCalendarEvents } from "@/firebase/eventsService";

const STATUS_STYLES = {
  scheduled: "bg-[#DCEBEF] text-[#2C6975]",
  completed: "bg-[#E5F0E2] text-[#3F7763]",
  cancelled: "bg-[#F7EED8] text-[#8A6822]",
};

const REMINDER_LABELS = {
  half_hour_before: "30 minutes before",
  two_hours_before: "2 hours before",
  one_day_before: "1 day before",
  three_days_before: "3 days before",
  one_week_before: "1 week before",
  event_time: "At meeting time",
};

function getMeetingDateTime(event) {
  if (!event?.date || !event?.time) return null;

  const date = new Date(`${event.date}T${event.time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekBounds(referenceDate) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function getReminderDisplay(event) {
  if (!event || event.addReminder === false) return null;
  if (event.reminderLabel) return event.reminderLabel;

  if (event.reminderMode === "custom") {
    if (!event.customReminderDate || !event.customReminderTime) return null;
    return `${event.customReminderDate}, ${event.customReminderTime}`;
  }

  if (event.reminderOption) {
    return REMINDER_LABELS[event.reminderOption] || event.reminderOption;
  }

  return null;
}

export default function MeetingRepository({ refreshKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [summaryFilter, setSummaryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCalendarEvents();
      setEvents(data || []);
    } catch (loadError) {
      console.error("Failed to load meeting repository", loadError);
      setEvents([]);
      setError("Failed to load meetings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadEvents();
    }, 0);
    const refreshIntervalId = window.setInterval(() => {
      void loadEvents();
    }, 60000);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(refreshIntervalId);
    };
  }, [loadEvents, refreshKey]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const weekBounds = getWeekBounds(now);
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      if (!["scheduled", "completed", "cancelled"].includes(event.status)) {
        return false;
      }

      const meetingDateTime = getMeetingDateTime(event);
      if (!meetingDateTime) return false;

      if (normalizedSearch) {
        const searchableText = [
          event.clientName,
          event.title,
          event.notes,
          event.meetingSummary,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");

        if (!searchableText.includes(normalizedSearch)) return false;
      }

      if (statusFilter !== "all" && event.status !== statusFilter) return false;

      if (dateFilter === "upcoming" && meetingDateTime < now) return false;
      if (dateFilter === "past" && meetingDateTime >= now) return false;
      if (
        dateFilter === "today" &&
        (meetingDateTime < todayStart || meetingDateTime >= tomorrowStart)
      ) {
        return false;
      }
      if (
        dateFilter === "this_week" &&
        (meetingDateTime < weekBounds.start || meetingDateTime >= weekBounds.end)
      ) {
        return false;
      }
      if (
        dateFilter === "this_month" &&
        (meetingDateTime < monthStart || meetingDateTime >= nextMonthStart)
      ) {
        return false;
      }

      const hasSummary = Boolean(event.meetingSummary?.trim());
      if (summaryFilter === "with_summary" && !hasSummary) return false;
      if (summaryFilter === "missing_summary" && hasSummary) return false;
      if (
        summaryFilter === "completed_without_summary" &&
        (event.status !== "completed" || hasSummary)
      ) {
        return false;
      }

      const normalizedPriority = event.priority || "normal";
      if (priorityFilter !== "all" && normalizedPriority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [dateFilter, events, priorityFilter, searchQuery, statusFilter, summaryFilter]);

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
    setSummaryFilter("all");
    setPriorityFilter("all");
  }

  const hasActiveFilters =
    searchQuery.trim() ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    summaryFilter !== "all" ||
    priorityFilter !== "all";

  return (
    <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_14px_34px_rgba(44,105,117,0.08)] sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#D7E3D5] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
            Meeting repository
          </p>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E]">
            All Meetings
          </h2>
          <p className="mt-2 text-sm text-[#60777B]">
            Search meeting history, summaries, and upcoming conversations.
          </p>
        </div>
        <p className="text-sm font-semibold text-[#60777B]">
          {filteredEvents.length} of {events.length} meetings
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1.6fr)_repeat(4,minmax(9rem,1fr))]">
          <label className="relative block">
            <span className="sr-only">Search meetings</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A8589]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search client, title, notes, or summary"
              className="w-full rounded-xl border border-[#C9D9D1] bg-white py-3 pl-11 pr-4 text-sm text-[#173A40] outline-none placeholder:text-[#829497] focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
            />
          </label>

          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-[#C9D9D1] bg-white px-3 py-3 text-sm font-semibold text-[#31585F] outline-none focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
            >
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by date</span>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-xl border border-[#C9D9D1] bg-white px-3 py-3 text-sm font-semibold text-[#31585F] outline-none focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
            >
              <option value="all">All dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="today">Today</option>
              <option value="this_week">This week (Mon-Sun)</option>
              <option value="this_month">This month</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by meeting summary</span>
            <select
              value={summaryFilter}
              onChange={(event) => setSummaryFilter(event.target.value)}
              className="w-full rounded-xl border border-[#C9D9D1] bg-white px-3 py-3 text-sm font-semibold text-[#31585F] outline-none focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
            >
              <option value="all">All summaries</option>
              <option value="with_summary">With summary</option>
              <option value="missing_summary">Missing summary</option>
              <option value="completed_without_summary">Completed without summary</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-xl border border-[#C9D9D1] bg-white px-3 py-3 text-sm font-semibold text-[#31585F] outline-none focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
            >
              <option value="all">All priorities</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-[#2C6975] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-8 text-center text-sm font-semibold text-[#60777B]">
          Loading meetings...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-3 rounded-full bg-[#2C6975] px-4 py-2 text-sm font-bold text-white hover:bg-[#245C66]"
          >
            Try again
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-8 text-center">
          <p className="font-bold text-[#31585F]">No meetings found</p>
          <p className="mt-1 text-sm text-[#60777B]">
            Try adjusting the search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const meetingDateTime = getMeetingDateTime(event);
            const hasSummary = Boolean(event.meetingSummary?.trim());

            return (
              <article
                key={event.id}
                className="rounded-2xl border border-[#D7E3D5] bg-white p-4 transition hover:border-[#9FBFB4] hover:shadow-[0_8px_20px_rgba(44,105,117,0.07)] sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[event.status]}`}>
                        {event.status}
                      </span>
                      {event.priority === "high" && (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                          High priority
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${hasSummary ? "bg-[#E5F0E2] text-[#3F7763]" : "bg-[#EEF1EF] text-[#6A8589]"}`}>
                        {hasSummary ? "Summary added" : "No summary"}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate text-lg font-bold text-[#15383E]">
                      {event.title || "Meeting"}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2C6975]">
                      <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="truncate">{event.clientName || "No client assigned"}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#60777B]">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                        {meetingDateTime?.toLocaleDateString() || event.date}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock3 aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                        {meetingDateTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || event.time}
                      </span>
                    </div>

                    {event.notes && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#60777B]">
                        <span className="font-bold text-[#31585F]">Notes: </span>
                        {event.notes}
                      </p>
                    )}
                    {hasSummary && (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#60777B]">
                        <span className="font-bold text-[#31585F]">Summary: </span>
                        {event.meetingSummary}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="shrink-0 rounded-full border border-[#BFD0CA] bg-[#F7FAF5] px-4 py-2 text-sm font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#EEF4EC]"
                  >
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.24)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Meeting details"
          >
            <div className="flex items-start justify-between bg-[#2C6975] px-6 py-5 text-white">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDE0C9]">
                  Meeting details
                </p>
                <h3 className="mt-1 truncate text-xl font-bold">
                  {selectedEvent.title || "Meeting"}
                </h3>
                <p className="mt-1 text-sm text-white/75">
                  {selectedEvent.clientName || "No client assigned"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20"
                aria-label="Close meeting details"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 px-6 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Date</p>
                <p className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.date}</p>
              </div>
              <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Time</p>
                <p className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.time}</p>
              </div>
              <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Status</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[#31585F]">{selectedEvent.status}</p>
              </div>
              <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Priority</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[#31585F]">{selectedEvent.priority || "normal"}</p>
              </div>

              {getReminderDisplay(selectedEvent) && (
                <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Reminder</p>
                  <p className="mt-1 text-sm font-semibold text-[#31585F]">{getReminderDisplay(selectedEvent)}</p>
                </div>
              )}

              {selectedEvent.calendarSyncLabel && (
                <div className="rounded-2xl border border-[#D7E3D5] bg-[#F3F7F1] p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6A8589]">
                    <CalendarSync aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                    Calendar sync
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#31585F]">{selectedEvent.calendarSyncLabel}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Notes</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-[#C9D9D1] bg-[#EAF2EA] p-4 text-sm leading-6 text-[#31585F]">
                  {selectedEvent.notes?.trim() || "No notes added."}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">Meeting summary</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-2xl border border-[#C9D9D1] bg-[#F3F7F1] p-4 text-sm leading-6 text-[#31585F]">
                  {selectedEvent.meetingSummary?.trim() || "No summary added yet."}
                </p>
              </div>

              {selectedEvent.googleCalendarLink && (
                <a
                  href={selectedEvent.googleCalendarLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#2C6975] hover:underline"
                >
                  Open in Google Calendar
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="flex justify-end border-t border-[#D7E3D5] px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full bg-[#2C6975] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#245C66]"
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
