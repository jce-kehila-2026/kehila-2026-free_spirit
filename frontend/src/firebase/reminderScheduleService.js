const REMINDER_OPTIONS = {
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
  
  export function buildReminderSchedule(eventData, eventId) {
    const eventDateTime = new Date(
      `${eventData.date}T${eventData.time}`,
    );
  
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
  
    return [
      {
        eventId,
        type: "event_reminder",
        priority: eventData.priority,
        reminderOption: eventData.reminderOption,
        reminderLabel: selectedReminder.label,
        message: `Reminder: ${eventData.title}`,
        scheduledFor: scheduledFor.toISOString(),
        status: "pending",
        statusLabel: "Waiting to be sent",
        retryCount: 0,
        channel: "site",
        channelLabel: "System reminder",
      },
    ];
  }