"use client";

import { useEffect, useState } from "react";
import EventCard from "@/components/Events/EventCard";
import { getEventsByClientId, type ClientEvent } from "@/firebase/clientEventsService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineTabProps {
  clientId: string;
  /** Forwarded from ClientProfileDashboard — not used for editing, kept for
   *  API-shape consistency with the other tab components. */
  isEditable?: boolean;
}

// ─── Status badge styling ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  scheduled:  "bg-blue-100   text-blue-700",
  completed:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-amber-100  text-amber-700",
  deleted:    "bg-slate-100  text-slate-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TimelineTab — Tier 1 Presentation Component
 *
 * Fetches and renders the full chronological list of meetings/events that were
 * ever scheduled for this client. Read-only; action buttons on EventCard are
 * intentionally left as no-ops (timeline is a history view, not a task list).
 *
 * Ready to be registered in ClientProfileDashboard.tsx TABS array and
 * TAB_COMPONENTS map without touching any existing logic.
 */
export default function TimelineWidget({ clientId }: TimelineTabProps) {
  const [events, setEvents]   = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
  let cancelled = false;

  // Define the async fetcher inside
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventsByClientId(clientId);
      if (!cancelled) {
        setEvents(data);
      }
    } catch (err) {
      if (!cancelled){
        console.error("Error fetching timeline:", err);
        setError("Failed to load timeline");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  fetchData();

  return () => { cancelled = true; };
}, [clientId]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-36 w-full animate-pulse rounded-3xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <span className="text-4xl" role="img" aria-label="No activity">
          🗂️
        </span>
        <p className="text-base font-bold text-slate-700">No activity found</p>
        <p className="text-sm text-slate-500">
          Meetings and events scheduled for this client will appear here.
        </p>
      </div>
    );
  }

  // ── Main timeline list ─────────────────────────────────────────────────────

  // Visible statuses to show in the header strip above each card.
  const statusLabel = (status: string) =>
    STATUS_STYLES[status] ? status : "scheduled";

  return (
    <section aria-label="Client activity timeline">
      <header className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-black text-slate-900">Activity Timeline</h2>
        <span className="text-xs font-semibold text-slate-400">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Timeline spine */}
      <ol className="relative flex flex-col gap-6 border-l-2 border-slate-200 pl-6">
        {events.map((event) => (
          <li key={event.id} className="relative">
            {/* Connector dot */}
            <span
              className={`absolute -left-[1.3rem] top-5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                STATUS_STYLES[event.status] ?? STATUS_STYLES.scheduled
              }`}
              aria-hidden
            />

            {/* Date stamp above card */}
            {event.date && (
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                {new Date(`${event.date}T${event.time ?? "00:00"}`).toLocaleDateString(
                  undefined,
                  { weekday: "short", year: "numeric", month: "short", day: "numeric" }
                )}
                {" · "}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    STATUS_STYLES[event.status] ?? STATUS_STYLES.scheduled
                  }`}
                >
                  {statusLabel(event.status)}
                </span>
              </p>
            )}

            {/*
             * EventCard is rendered in read-only mode.
             * Action callbacks are intentionally no-ops: the timeline is a
             * historical view; editing/cancelling events lives in the Events page.
             */}
            <EventCard
              event={event}
              isActionLoading={false}
              onEdit={() => {}}
              onComplete={() => {}}
              onCancel={() => {}}
              onDelete={() => {}}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
