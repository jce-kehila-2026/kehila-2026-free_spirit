"use client";

import { useState } from "react";

import { createEvent } from "@/firebase/eventsService";
import {
  createNotifications,
} from "@/firebase/notificationsService";

import {
  buildReminderSchedule,
} from "@/firebase/reminderScheduleService";

export default function ScheduleMeetingForm() {
  const [formData, setFormData] = useState({
    title: "",
    notes: "",
    date: "",
    time: "",
    priority: "normal",
    reminderOption: "one_day_before",
  });

  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      const eventId = await createEvent({
        title: formData.title,
        notes: formData.notes,
        date: formData.date,
        time: formData.time,
        priority: formData.priority,
        reminderOption: formData.reminderOption,
        status: "scheduled",
      });

      const reminders = buildReminderSchedule(
        formData,
        eventId,
      );

      await createNotifications(reminders);

      alert("Meeting created successfully!");

      setFormData({
        title: "",
        notes: "",
        date: "",
        time: "",
        priority: "normal",
        reminderOption: "one_day_before",
      });
    } catch (error) {
      console.error(error);
      alert("Failed to create meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
      <div className="mb-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-lg shadow-blue-200">
          📅
        </div>

        <h2 className="text-2xl font-black text-slate-950">
          Schedule a New Meeting
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create a meeting and configure reminder timing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Meeting title
          </label>

          <input
            type="text"
            name="title"
            placeholder="Example: Follow-up meeting with participant"
            value={formData.title}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Meeting notes
          </label>

          <textarea
            name="notes"
            placeholder="Add notes or important details..."
            value={formData.notes}
            onChange={handleChange}
            className={`${inputClass} min-h-28 resize-none`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Date
            </label>

            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Time
            </label>

            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Follow-up importance
          </label>

          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="normal">Regular</option>
            <option value="high">Important</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Reminder timing
          </label>

          <select
            name="reminderOption"
            value={formData.reminderOption}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="two_hours_before">
              Remind 2 hours before
            </option>

            <option value="one_day_before">
              Remind 1 day before
            </option>

            <option value="three_days_before">
              Remind 3 days before
            </option>

            <option value="one_week_before">
              Remind 1 week before
            </option>

            <option value="event_time">
              Remind at meeting time
            </option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? "Creating meeting..." : "Create Meeting"}
        </button>
      </form>
    </section>
  );
}