const REMINDER_OPTIONS = {
  half_hour_before: {
    label: "30 minutes before",
    hoursBefore: 0.5,
  },
  two_hours_before: {
    label: "2 hours before",
    hoursBefore: 2,
  },

  one_day_before: {
    label: "1 day before",
    daysBefore: 1,
  },

  three_days_before: {
    label: "3 days before",
    daysBefore: 3,
  },

  one_week_before: {
    label: "1 week before",
    daysBefore: 7,
  },

  event_time: {
    label: "At meeting time",
  },
};

function buildBaseReminder(eventData, eventId, scheduledFor, reminderLabel) {
  return {
    eventId,

    clientId: eventData.clientId || null,
    clientName: eventData.clientName || "",

    type: "event_reminder",

    priority: eventData.priority,

    reminderMode: eventData.reminderMode,
    reminderOption: eventData.reminderOption,
    reminderLabel,

    message: `Reminder: ${eventData.title}`,

    scheduledFor: scheduledFor.toISOString(),

    status: "pending",
    statusLabel: "Waiting to be sent",

    retryCount: 0,

    channel: "site",
    channelLabel: "System reminder",
  };
}

function buildPresetReminder(eventData, eventId) {
  const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);

  const selectedReminder =
    REMINDER_OPTIONS[eventData.reminderOption] ||
    REMINDER_OPTIONS.one_day_before;

  const scheduledFor = new Date(eventDateTime);

  if (selectedReminder.daysBefore) {
    scheduledFor.setDate(
      scheduledFor.getDate() - selectedReminder.daysBefore,
    );
  }

  if (selectedReminder.hoursBefore) {
    scheduledFor.setHours(
      scheduledFor.getHours() - selectedReminder.hoursBefore,
    );
  }

  return buildBaseReminder(
    eventData,
    eventId,
    scheduledFor,
    selectedReminder.label,
  );
}

function buildCustomReminder(eventData, eventId) {
  const scheduledFor = new Date(
    `${eventData.customReminderDate}T${eventData.customReminderTime}`,
  );

  return buildBaseReminder(
    eventData,
    eventId,
    scheduledFor,
    "Custom reminder time",
  );
}

export function buildReminderSchedule(eventData, eventId) {
  const now = new Date();

  const reminder =
    eventData.reminderMode === "custom"
      ? buildCustomReminder(eventData, eventId)
      : buildPresetReminder(eventData, eventId);

  const scheduledFor = new Date(reminder.scheduledFor);

  if (Number.isNaN(scheduledFor.getTime())) {
    throw new Error("Please choose a valid reminder time.");
  }

  if (scheduledFor <= now) {
    throw new Error(
      "The selected reminder time has already passed. Please choose a future reminder time.",
    );
  }

  return [reminder];
}