"use client";

import { useState } from "react";
import { CalendarPlus, Check, Cloud, Clock3 } from "lucide-react";

import { createEvent } from "@/firebase/eventsService";
import { createNotifications } from "@/firebase/notificationsService";
import { buildReminderSchedule } from "@/firebase/reminderScheduleService";
import { updateEvent } from "@/firebase/eventsService";
import { deleteNotificationsByEventId } from "@/firebase/notificationsService";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/firebase/googleCalendarService";
import { auth } from "@/firebase/firebase";
export default function ScheduleMeetingForm({
  clientId = "", // Changed from null to "" so typescript knows it can be a string
  clientName = "",
  onMeetingCreated = null,

  initialData = null,
  isEditMode = false,
  onEditCompleted = null,
  onClose, // Added this so the popup modal (in client card dashboard) can close
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
  const isAlreadySyncedToGoogle = Boolean(initialData?.googleCalendarEventId);
  const [syncToGoogle, setSyncToGoogle] = useState(isAlreadySyncedToGoogle);
  const [syncWarning, setSyncWarning] = useState("");
  const [addReminder, setAddReminder] = useState(
    initialData
      ? Boolean(
          initialData.reminderMode ||
            initialData.reminderOption ||
            initialData.customReminderDate ||
            initialData.customReminderTime,
        )
      : false,
  );

  const inputClass =
    "w-full rounded-xl border border-[#C9D9D1] bg-[#F7FAF5] px-4 py-3 text-sm text-[#173A40] outline-none transition placeholder:text-[#829497] focus:border-[#6BB2A0] focus:bg-white focus:ring-4 focus:ring-[#D7E7D4]";

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

    if (addReminder && formData.reminderMode === "custom") {
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
    setAddReminder(false);
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
  
      // Read latest reminder controls directly from the form to avoid stale/overwritten state
      let resolvedReminderMode = formData.reminderMode;
      let resolvedReminderOption = formData.reminderOption;
      let resolvedCustomReminderDate = formData.customReminderDate;
      let resolvedCustomReminderTime = formData.customReminderTime;

      if (addReminder && event.currentTarget && event.currentTarget.elements) {
        const elems = event.currentTarget.elements;
        if (elems["reminderMode"]) resolvedReminderMode = elems["reminderMode"].value;
        if (resolvedReminderMode === "preset" && elems["reminderOption"]) {
          resolvedReminderOption = elems["reminderOption"].value;
        }
        if (resolvedReminderMode === "custom") {
          if (elems["customReminderDate"]) resolvedCustomReminderDate = elems["customReminderDate"].value;
          if (elems["customReminderTime"]) resolvedCustomReminderTime = elems["customReminderTime"].value;
        }
      }

      const user = auth.currentUser;
      let authorName = "Unknown";
      if (user) {
        if (user.first_name && user.last_name) {
          authorName = `${user.first_name} ${user.last_name}`;
        } else if (user.email) {
          authorName = user.email.charAt(0).toUpperCase();
        }
      }

      const eventPayload = {
        title: formData.title,
        notes: formData.notes,
        date: formData.date,
        time: formData.time,
        priority: formData.priority,
        // persist reminder fields but actual creation is conditional on `addReminder`
        reminderMode: addReminder ? resolvedReminderMode : null,
        reminderOption: addReminder && resolvedReminderMode === "preset" ? resolvedReminderOption : null,
        customReminderDate: addReminder && resolvedReminderMode === "custom" ? resolvedCustomReminderDate : "",
        customReminderTime: addReminder && resolvedReminderMode === "custom" ? resolvedCustomReminderTime : "",
        addReminder: addReminder,
        
        calendarSyncStatus: initialData?.calendarSyncStatus || "not_synced",
        calendarSyncLabel:
          initialData?.calendarSyncLabel || "Not synced to calendar yet",
  
        clientId: initialData?.clientId || clientId,
        clientName: initialData?.clientName || clientName,
  
        googleCalendarEventId: initialData?.googleCalendarEventId || null,
        status: "scheduled",
        authorName: initialData?.authorName || authorName,
      };
  
      if (isEditMode && initialData?.id) {
        await updateEvent(initialData.id, eventPayload);

        // If this meeting was previously synced, update the Google Calendar event automatically.
        // If it was not synced but the user checked the sync checkbox, create a new Google event.
        try {
          // ensure local id is present for extendedProperties
          eventPayload.id = initialData.id;

          if (initialData?.googleCalendarEventId) {
            const updatedGoogleEvent = await updateGoogleCalendarEvent(initialData.googleCalendarEventId, eventPayload);

            // persist Google metadata on success
            await updateEvent(initialData.id, {
              googleCalendarEventId: updatedGoogleEvent?.id || initialData.googleCalendarEventId,
              googleCalendarLink: updatedGoogleEvent?.htmlLink || updatedGoogleEvent?.hangoutLink || null,
              calendarSyncStatus: "synced",
              calendarSyncLabel: "Synced to Google Calendar",
            });
          } else if (syncToGoogle) {
            const createdGoogleEvent = await createGoogleCalendarEvent(eventPayload);

            await updateEvent(initialData.id, {
              googleCalendarEventId: createdGoogleEvent?.id || null,
              googleCalendarLink: createdGoogleEvent?.htmlLink || createdGoogleEvent?.hangoutLink || null,
              calendarSyncStatus: "synced",
              calendarSyncLabel: "Synced to Google Calendar",
            });
          }
        } catch (err) {
          // Do not block meeting update — mark sync as failed and show a warning
          try {
            await updateEvent(initialData.id, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Failed to sync to Google Calendar",
            });
          } catch {
            // Ignore Firestore sync status update failure
          }

          setSyncWarning(
            err?.message || "Failed to sync meeting to Google Calendar.",
          );
        }

        // Reminder handling: if user disabled reminders, remove any existing notifications.
        if (!addReminder) {
          await deleteNotificationsByEventId(initialData.id);
        } else {
          await deleteNotificationsByEventId(initialData.id);

          const reminders = buildReminderSchedule(
            eventPayload,
            initialData.id,
          );

          await createNotifications(reminders);
        }

        if (onEditCompleted) {
          onEditCompleted();
        }

        alert("Meeting updated successfully!");
        return;
      }
  
      const eventId = await createEvent(eventPayload);

      // Only create reminders if the user opted into them
      if (addReminder) {
        const reminders = buildReminderSchedule(eventPayload, eventId);
        await createNotifications(reminders);
      }
      // Optional Google Calendar sync (non-blocking for meeting creation)
      if (syncToGoogle) {
        try {
          // provide local id for extendedProperties in Google event
          eventPayload.id = eventId;

          const googleEvent = await createGoogleCalendarEvent(eventPayload);

          // update Firestore event with Google sync metadata
          await updateEvent(eventId, {
            googleCalendarEventId: googleEvent?.id || null,
            googleCalendarLink: googleEvent?.htmlLink || googleEvent?.hangoutLink || null,
            calendarSyncStatus: "synced",
            calendarSyncLabel: "Synced to Google Calendar",
          });
        } catch (err) {
          // Do not block meeting creation — mark sync as failed and show a warning
          try {
            await updateEvent(eventId, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Failed to sync to Google Calendar",
            });
          } catch {
            // Ignore Firestore sync status update failure
          }

          setSyncWarning(
            err?.message || "Failed to sync meeting to Google Calendar.",
          );
        }
      }
  
      if (onMeetingCreated) {
        onMeetingCreated();
      }

      if (onClose){
        onClose();
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
    <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
      <div className="mb-5 border-b border-[#D7E3D5] pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C6975] text-white">
            <CalendarPlus aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
              Meeting details
            </p>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E]">
              {isEditMode ? "Edit Meeting" : "Schedule a New Meeting"}
            </h2>
          </div>
        </div>

        {clientName ? (
          <p className="mt-4 rounded-xl bg-[#DCEAD6] px-4 py-3 text-sm font-semibold text-[#2C6975]">
            Scheduling meeting for: {clientName}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#60777B]">
            Create a meeting or follow-up. You can add a reminder if needed.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {formError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {formError}
          </div>
        )}

        {syncWarning && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {syncWarning}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-[#31585F]">
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

          <div className="mt-3">
            <label className="mb-2 block text-sm font-bold text-[#31585F]">
              Meeting notes
            </label>

            <textarea
              name="notes"
              placeholder="Notes about the meeting (agenda, links, participants...)"
              value={formData.notes}
              onChange={handleChange}
              className={inputClass + " min-h-[88px] resize-none"}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#31585F]">
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
            <label className="mb-2 block text-sm font-bold text-[#31585F]">
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
          <label className="mb-2 block text-sm font-bold text-[#31585F]">
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

        <div className="mt-1">
          <p className="mb-2 block text-sm font-bold text-[#31585F]">Reminder</p>

          <label className="mb-2 inline-flex flex-col gap-2 rounded-xl bg-[#EEF4EC] p-3 text-sm text-[#31585F] w-full">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="addReminder"
                checked={addReminder}
                onChange={(e) => setAddReminder(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2C6975]"
              />
              <span className="font-bold">Add reminder for this meeting</span>
            </div>
            <span className="text-xs text-[#60777B]">Create a notification before this meeting.</span>
          </label>

          {addReminder && (
            <>
              <label className="mb-2 mt-3 block text-sm font-bold text-[#31585F]">
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

              {formData.reminderMode === "preset" ? (
                <div className="mt-3">
                  <label className="mb-2 block text-sm font-bold text-[#31585F]">
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
                <div className="rounded-2xl border border-[#BFD9D2] bg-[#EAF2EA] p-4 mt-3">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#245C66]">
                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                    Custom reminder time
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#6A8589]">
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
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#6A8589]">
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
            </>
          )}
        </div>

        <div>
          {isEditMode && isAlreadySyncedToGoogle ? (
            <label className="mb-2 inline-flex items-start gap-3 rounded-xl bg-[#EEF4EC] p-3 text-sm font-bold leading-5 text-[#31585F]">
              <input
                type="checkbox"
                name="syncToGoogle"
                checked={true}
                disabled
                className="mt-0.5 h-4 w-4 rounded accent-[#2C6975]"
              />
              <Cloud aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#2C6975]" />
              <span>Already synced to Google Calendar — edits will update the Google event</span>
            </label>
          ) : (
            <label className="mb-2 inline-flex items-center gap-3 rounded-xl bg-[#EEF4EC] p-3 text-sm font-bold text-[#31585F]">
              <input
                type="checkbox"
                name="syncToGoogle"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2C6975]"
              />
              <Cloud aria-hidden="true" className="h-4 w-4 text-[#2C6975]" />
              <span>Sync to Google Calendar</span>
            </label>
          )}
        </div>

       <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2C6975] px-5 py-3.5 font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:bg-[#9BB9B4]"
        >
          {!loading && <Check aria-hidden="true" className="h-5 w-5" />}
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
