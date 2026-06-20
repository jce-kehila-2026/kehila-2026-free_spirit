"use client";

import { useEffect, useState, useCallback } from "react";
import EventCard from "@/components/Events/EventCard";
import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm";
import { getEventsByClientId, type ClientEvent } from "@/firebase/clientEventsService";
import { updateEvent } from "@/firebase/eventsService";
import useEventActions from "@/hooks/useEventActions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineTabProps {
  clientId: string;
  /** Forwarded from ClientProfileDashboard — not used for editing, kept for
   *  API-shape consistency with the other tab components. */
  isEditable?: boolean;
}

// ─── Status badge styling ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  scheduled:  "bg-[#DCEBEF] text-[#2C6975]",
  completed:  "bg-[#E5F0E2] text-[#3F7763]",
  cancelled:  "bg-[#F7EED8] text-[#8A6822]",
  deleted:    "bg-[#EEF4EC] text-[#607B80]",
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
  const [eventToEdit, setEventToEdit] = useState<ClientEvent | null>(null);
  const [summaryEvent, setSummaryEvent] = useState<ClientEvent | null>(null);
  const [meetingSummaryDraft, setMeetingSummaryDraft] = useState("");
  const [isSavingMeetingSummary, setIsSavingMeetingSummary] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventsByClientId(clientId);
      setEvents(data);
    } catch (err) {
      console.error("Error fetching timeline:", err);
      setError("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    let isCancelled = false;

    // Keep initial loading cancellable so a stale client request cannot update
    // state after this widget unmounts or receives a different clientId.
    Promise.resolve()
      .then(() => {
        if (isCancelled) return null;

        setLoading(true);
        setError(null);
        return getEventsByClientId(clientId);
      })
      .then((data) => {
        if (isCancelled || !data) return;
        setEvents(data);
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        console.error("Error fetching timeline:", err);
        setError("Failed to load timeline");
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clientId]);

  // Wire shared actions and refresh hook
  const { actionLoadingId, handleComplete, handleCancel, handleDelete } = useEventActions({ onRefresh: fetchData });

  function handleOpenFullEdit(event: ClientEvent) {
    if (event.status !== "scheduled" || isSavingMeetingSummary) return;

    setSummaryEvent(null);
    setMeetingSummaryDraft("");
    setEventToEdit(event);
  }

  function handleEditCompleted() {
    setEventToEdit(null);
    void fetchData();
  }

  function handleOpenSummaryEdit(event: ClientEvent) {
    if (isSavingMeetingSummary) return;

    setEventToEdit(null);
    setSummaryEvent(event);
    setMeetingSummaryDraft(event.meetingSummary || "");
  }

  function handleCancelSummaryEdit() {
    if (isSavingMeetingSummary) return;

    setSummaryEvent(null);
    setMeetingSummaryDraft("");
  }

  async function handleSaveMeetingSummary() {
    if (!summaryEvent) return;

    const trimmedValue = meetingSummaryDraft.trim();

    try {
      setIsSavingMeetingSummary(true);
      await updateEvent(summaryEvent.id, { meetingSummary: trimmedValue });

      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === summaryEvent.id
            ? { ...event, meetingSummary: trimmedValue }
            : event,
        ),
      );
      setSummaryEvent(null);
      setMeetingSummaryDraft("");
      await fetchData();
    } catch (err) {
      console.error("Meeting summary update failed:", err);
      alert("Failed to save meeting summary.");
    } finally {
      setIsSavingMeetingSummary(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 w-full animate-pulse rounded-2xl bg-[#EEF4EC]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#E8C1BA] bg-[#FFF2EF] px-6 py-8 text-center">
        <p className="text-sm font-semibold text-[#A3483C]">{error}</p>
      </div>
    );
  }

  // Filter out deleted events from the main timeline view
  const visibleEvents = events.filter((e) => e.status !== "deleted");

  if (visibleEvents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] px-6 py-12 text-center">
        <span className="text-4xl" role="img" aria-label="No activity">
          🗂️
        </span>
        <p className="text-base font-bold text-[#31585F]">No activity found</p>
        <p className="max-w-sm text-sm leading-6 text-[#607B80]">
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
    <>
      <section aria-label="Client activity timeline">
      <header className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-[#15383E]">Activity timeline</h2>
        <span className="rounded-full bg-[#EEF4EC] px-3 py-1 text-xs font-bold text-[#607B80]">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Timeline spine */}
      <ol className="relative flex flex-col gap-6 border-l-2 border-[#D7E3D5] pl-6">
        {visibleEvents.map((event) => (
          <li key={event.id} className="relative">
            {/* Connector dot */}
            <span
              className={`absolute -left-[1.3rem] top-5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[#FFFDF8] ${
                STATUS_STYLES[event.status] ?? STATUS_STYLES.scheduled
              }`}
              aria-hidden
            />

            {/* Date stamp above card */}
            {event.date && (
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6A8589]">
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


            <EventCard
              event={event}
              isActionLoading={
                actionLoadingId === event.id || isSavingMeetingSummary
              }
              onEdit={handleOpenFullEdit}
              onEditSummary={handleOpenSummaryEdit}
              onComplete={async (id: string) => {
                try {
                  await handleComplete(id);
                } catch (err) {
                  console.error("Complete failed:", err);
                }
              }}
              onCancel={async (id: string) => {
                try {
                  const ev = events.find((x) => x.id === id);
                  if (ev) await handleCancel(ev);
                } catch (err) {
                  console.error("Cancel failed:", err);
                }
              }}
              onDelete={async (id: string) => {
                try {
                  const ev = events.find((x) => x.id === id);
                  if (ev) await handleDelete(ev);
                } catch (err) {
                  console.error("Delete failed:", err);
                }
              }}
            />
          </li>
        ))}
      </ol>
      </section>

      {eventToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm"
          onClick={() => setEventToEdit(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#E7F0E2] p-4 shadow-[0_24px_60px_rgba(21,56,62,0.24)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit meeting"
          >
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#2C6975] px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#CDE0C9]">
                  Meeting workspace
                </p>
                <h3 className="mt-0.5 text-lg font-bold">Edit Meeting</h3>
              </div>
              <button
                type="button"
                onClick={() => setEventToEdit(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-xl text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close edit meeting"
              >
                &times;
              </button>
            </div>

            <ScheduleMeetingForm
              initialData={eventToEdit}
              isEditMode={true}
              onEditCompleted={handleEditCompleted}
              onClose={() => setEventToEdit(null)}
            />
          </div>
        </div>
      )}

      {summaryEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm"
          onClick={handleCancelSummaryEdit}
        >
          <div
            className="w-full max-w-xl rounded-[1.75rem] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.24)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit meeting summary"
          >
            <div className="flex items-start justify-between rounded-t-[1.75rem] bg-[#2C6975] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDE0C9]">
                  Meeting notes
                </p>
                <h3 className="mt-1 text-xl font-bold">Meeting summary</h3>
              </div>
              <button
                type="button"
                onClick={handleCancelSummaryEdit}
                disabled={isSavingMeetingSummary}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-xl text-white ring-1 ring-white/25 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close meeting summary"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={meetingSummaryDraft}
                onChange={(event) => setMeetingSummaryDraft(event.target.value)}
                disabled={isSavingMeetingSummary}
                className="min-h-36 w-full resize-y rounded-xl border border-[#BFD0CA] bg-white px-4 py-3 text-sm leading-6 text-[#31585F] outline-none transition placeholder:text-[#829497] focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Add outcomes, decisions, or follow-up details..."
              />

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelSummaryEdit}
                  disabled={isSavingMeetingSummary}
                  className="rounded-full border border-[#BFD0CA] bg-white px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMeetingSummary}
                  disabled={isSavingMeetingSummary}
                  className="rounded-full bg-[#2C6975] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingMeetingSummary ? "Saving..." : "Save summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
