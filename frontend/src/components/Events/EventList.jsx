"use client";

import { useEffect, useState } from "react";
import { getEvents } from "@/firebase/eventsService";
import EventCard from "./EventCard";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Upcoming Meetings</h2>
          <p className="mt-1 text-sm text-slate-500">
            View scheduled events and their reminder priority.
          </p>
        </div>

        <button
          onClick={loadEvents}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-lg font-bold text-slate-700">Loading events...</p>
          <p className="mt-1 text-sm text-slate-500">Fetching meetings from Firestore</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🗓️
          </div>
          <p className="text-lg font-bold text-slate-800">No meetings yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create the first meeting using the form on the left.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}