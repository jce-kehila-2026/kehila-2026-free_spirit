"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw, X } from "lucide-react";

import { getEventsWithinDays } from "@/firebase/eventsService";
import useEventActions from "@/hooks/useEventActions";

import ScheduleMeetingForm from "./ScheduleMeetingForm";

import EventCard from "./EventCard";

export default function EventList({
  refreshKey = 0,
  onDataChanged,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventToEdit, setEventToEdit] = useState(null);

  async function loadEvents() {
    try {
      setLoading(true);
      const eventsFromDb = await getEventsWithinDays(2);
      setEvents(eventsFromDb);
    } catch (error) {
      console.error(error);
      alert("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  // Shared action handlers (business logic) are provided by the hook.
  const {
    actionLoadingId,
    handleComplete: hookComplete,
    handleCancel: hookCancel,
    handleDelete: hookDelete,
  } = useEventActions({ onRefresh: loadEvents });

  function handleEditCompleted() {
    setEventToEdit(null);
  
    if (onDataChanged) {
      onDataChanged();
    }
  
    loadEvents();
  }
  async function handleComplete(eventId) {
    try {
      await hookComplete(eventId);

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to complete meeting.");
    }
  }

  async function handleCancel(event) {
    try {
      await hookCancel(event);

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to cancel meeting.");
    }
  }

  async function handleDelete(event) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this meeting?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await hookDelete(event);

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete meeting.");
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadEvents();
    }, 60000);
  
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshKey]);


  return (
    <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#D7E3D5] pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
            Coming up
          </p>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E]">
            Upcoming Meetings
          </h2>

          <p className="mt-2 text-sm text-[#60777B]">
            View scheduled meetings and manage follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#BFD0CA] bg-white px-4 py-2 text-sm font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#F3F7F1]"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-7 text-center">
          <p className="text-lg font-bold text-[#31585F]">
            Loading meetings...
          </p>

          <p className="mt-1 text-sm text-[#6A8589]">
            Fetching scheduled meetings
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2C6975] ring-1 ring-[#D7E3D5]">
            <CalendarDays aria-hidden="true" className="h-7 w-7" />
          </div>

          <p className="text-lg font-bold text-[#31585F]">
            No upcoming meetings
          </p>

          <p className="mt-1 text-sm text-[#6A8589]">
            Create the first meeting using the form on the left.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
           <EventCard
           key={event.id}
           event={event}
           isActionLoading={actionLoadingId === event.id}
           onEdit={setEventToEdit}
           onComplete={handleComplete}
           onCancel={() => handleCancel(event)}
           onDelete={() => handleDelete(event)}
         />
          ))}
        </div>
      )}
      {eventToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 px-4 py-8 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#E7F0E2] p-3 shadow-[0_24px_60px_rgba(21,56,62,0.24)] sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Edit meeting"
          >
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#2C6975] px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#CDE0C9]">
                  Meeting workspace
                </p>
                <h3 className="mt-0.5 text-lg font-bold">
                  Edit Meeting
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEventToEdit(null)}
                aria-label="Close edit meeting"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <ScheduleMeetingForm
              initialData={eventToEdit}
              isEditMode={true}
              onEditCompleted={handleEditCompleted}
            />
          </div>
        </div>
      )}
    </section>
  );
}
