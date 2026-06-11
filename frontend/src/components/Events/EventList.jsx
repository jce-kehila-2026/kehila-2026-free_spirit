"use client";

import { useEffect, useState } from "react";

import {
  cancelEvent,
  completeEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "@/firebase/eventsService";
import { deleteGoogleCalendarEvent } from "@/firebase/googleCalendarService";
import {
  deleteNotificationsByEventId,
  updateNotificationsByEventId,
} from "@/firebase/notificationsService";

import ScheduleMeetingForm from "./ScheduleMeetingForm";

import EventCard from "./EventCard";

export default function EventList({
  refreshKey = 0,
  onDataChanged,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);

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

  function handleEditCompleted() {
    setEventToEdit(null);
  
    if (onDataChanged) {
      onDataChanged();
    }
  
    loadEvents();
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

  async function handleCancel(event) {
    try {
      setActionLoadingId(event.id);

      // If synced to Google Calendar, attempt to remove it (non-blocking)
      if (event.googleCalendarEventId) {
        try {
          await deleteGoogleCalendarEvent(event.googleCalendarEventId);

          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "removed",
              calendarSyncLabel: "Removed from Google Calendar after cancellation",
            });
          } catch (e) {
            console.warn("Failed to update calendar sync metadata after Google delete", e);
          }
        } catch (googleErr) {
          console.error("Failed to remove Google Calendar event", googleErr);
          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Failed to remove from Google Calendar",
            });
          } catch (e) {
            console.warn("Failed to update calendar sync metadata after Google delete failure", e);
          }
        }
      }

      await cancelEvent(event.id);

      await updateNotificationsByEventId(event.id, {
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

  async function handleDelete(event) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this meeting?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setActionLoadingId(event.id);

      // If synced to Google Calendar, attempt to remove it (non-blocking)
      if (event.googleCalendarEventId) {
        try {
          await deleteGoogleCalendarEvent(event.googleCalendarEventId);

          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "removed",
              calendarSyncLabel: "Removed from Google Calendar after deletion",
            });
          } catch (e) {
            console.warn("Failed to update calendar sync metadata after Google delete", e);
          }
        } catch (googleErr) {
          console.error("Failed to remove Google Calendar event", googleErr);
          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Failed to remove from Google Calendar",
            });
          } catch (e) {
            console.warn("Failed to update calendar sync metadata after Google delete failure", e);
          }
        }
      }

      // Preserve notification history by marking them deleted
      await updateNotificationsByEventId(event.id, {
        status: "deleted",
        statusLabel: "Meeting deleted",
      });

      // Soft-delete the event document (deleteEvent now performs soft-delete)
      await deleteEvent(event.id);

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
           onEdit={setEventToEdit}
           onComplete={handleComplete}
           onCancel={() => handleCancel(event)}
           onDelete={() => handleDelete(event)}
         />
          ))}
        </div>
      )}
      {eventToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-slate-950">
                Edit Meeting
              </h3>

              <button
                type="button"
                onClick={() => setEventToEdit(null)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
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