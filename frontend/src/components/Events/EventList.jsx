"use client";

import { useEffect, useState } from "react";

import {
  cancelEvent,
  completeEvent,
  deleteEvent,
  getEvents,
} from "@/firebase/eventsService";
import {
  deleteNotificationsByEventId,
  updateNotificationsByEventId,
} from "@/firebase/notificationsService";

import EventCard from "./EventCard";

export default function EventList({
  refreshKey = 0,
  onDataChanged,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  async function loadEvents() {
    try {
      setLoading(true);
      const eventsFromDb = await getEvents();
      setEvents(eventsFromDb);
    } catch (error) {
      console.error(error);
      alert("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(eventId) {
    try {
      setActionLoadingId(eventId);
  
      await completeEvent(eventId);
  
      await updateNotificationsByEventId(eventId, {
        status: "completed",
        statusLabel: "Meeting completed",
      });

      if (onDataChanged) {
        onDataChanged();
      }
  
      await loadEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to complete meeting.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(eventId) {
    try {
      setActionLoadingId(eventId);
  
      await cancelEvent(eventId);
  
      await updateNotificationsByEventId(eventId, {
        status: "cancelled",
        statusLabel: "Meeting cancelled",
      });

      if (onDataChanged) {
        onDataChanged();
      }
  
      await loadEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel meeting.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(eventId) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this meeting?",
    );
  
    if (!shouldDelete) {
      return;
    }
  
    try {
      setActionLoadingId(eventId);
  
      await deleteNotificationsByEventId(eventId);
      await deleteEvent(eventId);

      if (onDataChanged) {
        onDataChanged();
      }
  
      await loadEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to delete meeting.");
    } finally {
      setActionLoadingId(null);
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
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Upcoming Meetings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View scheduled meetings and manage follow-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-lg font-bold text-slate-700">
            Loading meetings...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Fetching scheduled meetings
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🗓️
          </div>

          <p className="text-lg font-bold text-slate-800">
            No upcoming meetings
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Create the first meeting using the form on the left.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isActionLoading={actionLoadingId === event.id}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}