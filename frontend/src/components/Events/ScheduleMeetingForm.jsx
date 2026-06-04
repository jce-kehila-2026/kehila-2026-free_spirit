"use client";

import { useState } from "react";

import { createEvent } from "@/firebase/eventsService";
import { createNotifications } from "@/firebase/notificationsService";
import { buildReminderSchedule } from "@/firebase/reminderScheduleService";
import { updateEvent } from "@/firebase/eventsService";
import { deleteNotificationsByEventId } from "@/firebase/notificationsService";


export default function ScheduleMeetingForm({
  clientId = null,
  clientName = "",
  onMeetingCreated,

  initialData = null,
  isEditMode = false,
  onEditCompleted,
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    notes: initialData?.notes || "",
    date: initialData?.date || "",
    time: initialData?.time || "",
    priority: initialData?.priority || "normal",
    reminderMode: initialData?.reminderMode || "preset",
    reminderOption: initialData?.reminderOption || "one_day_before",
    customReminderDate: initialData?.customReminderDate || "",
    customReminderTime: initialData?.customReminderTime || "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const getMeetingDateTime = () => {
    return new Date(`${formData.date}T${formData.time}`);
  };

  const getCustomReminderDateTime = () => {
    return new Date(
      `${formData.customReminderDate}T${formData.customReminderTime}`,
    );
  };

  const validateForm = () => {
    const now = new Date();
    const meetingDateTime = getMeetingDateTime();

    if (Number.isNaN(meetingDateTime.getTime())) {
      return "Please choose a valid meeting date and time.";
    }

    if (meetingDateTime <= now) {
      return "Meeting time must be in the future.";
    }

    if (formData.reminderMode === "custom") {
      if (!formData.customReminderDate || !formData.customReminderTime) {
        return "Please choose a custom reminder date and time.";
      }

      const customReminderDateTime = getCustomReminderDateTime();

      if (Number.isNaN(customReminderDateTime.getTime())) {
        return "Please choose a valid reminder date and time.";
      }

      if (customReminderDateTime <= now) {
        return "Reminder time must be in the future.";
      }

      if (customReminderDateTime >= meetingDateTime) {
        return "Reminder time must be before the meeting time.";
      }
    }

    return "";
  };

  const resetForm = () => {
    setFormData({
      title: "",
      notes: "",
      date: "",
      time: "",
      priority: "normal",
      reminderMode: "preset",
      reminderOption: "one_day_before",
      customReminderDate: "",
      customReminderTime: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
  
    const validationMessage = validateForm();
  
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
  
    try {
      setLoading(true);
  
      const eventPayload = {
        title: formData.title,
        notes: formData.notes,
        date: formData.date,
        time: formData.time,
        priority: formData.priority,
        reminderMode: formData.reminderMode,
        reminderOption: formData.reminderOption,
        customReminderDate: formData.customReminderDate,
        customReminderTime: formData.customReminderTime,
        
        calendarSyncStatus: initialData?.calendarSyncStatus || "not_synced",
        calendarSyncLabel:
          initialData?.calendarSyncLabel || "Not synced to calendar yet",
  
        clientId: initialData?.clientId || clientId,
        clientName: initialData?.clientName || clientName,
  
        googleCalendarEventId: initialData?.googleCalendarEventId || null,
        status: "scheduled",
      };
  
      if (isEditMode && initialData?.id) {
        await updateEvent(initialData.id, eventPayload);
  
        await deleteNotificationsByEventId(initialData.id);
  
        const reminders = buildReminderSchedule(
          eventPayload,
          initialData.id,
        );
  
        await createNotifications(reminders);
  
        if (onEditCompleted) {
          onEditCompleted();
        }
  
        alert("Meeting updated successfully!");
        return;
      }
  
      const eventId = await createEvent(eventPayload);
  
      const reminders = buildReminderSchedule(
        eventPayload,
        eventId,
      );
  
      await createNotifications(reminders);
  
      if (onMeetingCreated) {
        onMeetingCreated();
      }
  
      alert("Meeting created successfully!");
      resetForm();
    } catch (error) {
      console.error(error);
      setFormError(
        error.message ||
          "Failed to save meeting. Please check the details and try again.",
      );
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
          {isEditMode ? "Edit Meeting" : "Schedule a New Meeting"}
        </h2>

        {clientName ? (
          <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Scheduling meeting for: {clientName}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Create a general meeting or event and choose when the reminder should be sent.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {formError}
          </div>
        )}

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
            Reminder setup
          </label>

          <select
            name="reminderMode"
            value={formData.reminderMode}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="preset">Choose from common options</option>
            <option value="custom">Choose a specific reminder time</option>
          </select>
        </div>

        {formData.reminderMode === "preset" ? (
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
              <option value="two_hours_before">Remind 2 hours before</option>
              <option value="one_day_before">Remind 1 day before</option>
              <option value="three_days_before">Remind 3 days before</option>
              <option value="one_week_before">Remind 1 week before</option>
              <option value="event_time">Remind at meeting time</option>
            </select>
          </div>
        ) : (
          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="mb-3 text-sm font-bold text-blue-900">
              Custom reminder time
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Reminder date
                </label>

                <input
                  type="date"
                  name="customReminderDate"
                  value={formData.customReminderDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Reminder time
                </label>

                <input
                  type="time"
                  name="customReminderTime"
                  value={formData.customReminderTime}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

       <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading
            ? isEditMode
              ? "Updating meeting..."
              : "Creating meeting..."
            : isEditMode
              ? "Update Meeting"
              : "Create Meeting"}
        </button>
      </form>
    </section>
  );
}