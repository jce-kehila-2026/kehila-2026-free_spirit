import { useState } from "react";

import {
  completeEvent,
  cancelEvent,
  deleteEvent,
  updateEvent,
} from "@/firebase/eventsService";
import { deleteGoogleCalendarEvent } from "@/firebase/googleCalendarService";
import { updateNotificationsByEventId } from "@/firebase/notificationsService";

export default function useEventActions({ onRefresh } = {}) {
  const [actionLoadingId, setActionLoadingId] = useState(null);

  async function handleComplete(eventId) {
    try {
      setActionLoadingId(eventId);

      await completeEvent(eventId);

      await updateNotificationsByEventId(eventId, {
        status: "completed",
        statusLabel: "Meeting completed",
      });

      if (onRefresh) await onRefresh();

      return { success: true };
    } catch (err) {
      throw err;
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
          // Treat a 410 (resource already deleted) as a non-fatal success.
          const msg = googleErr && googleErr.message ? String(googleErr.message) : "";
          if (msg.includes("Google Calendar API error 410") || msg.match(/\b410\b/)) {
            try {
              await updateEvent(event.id, {
                calendarSyncStatus: "removed",
                calendarSyncLabel: "Removed from Google Calendar (already deleted)",
              });
            } catch (e) {
              console.warn("Failed to update calendar sync metadata after Google 410", e);
            }
          } else {
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
      }

      await cancelEvent(event.id);

      await updateNotificationsByEventId(event.id, {
        status: "cancelled",
        statusLabel: "Meeting cancelled",
      });

      if (onRefresh) await onRefresh();

      return { success: true };
    } catch (err) {
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(event) {
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
          // Treat a 410 (resource already deleted) as a non-fatal success.
          const msg = googleErr && googleErr.message ? String(googleErr.message) : "";
          if (msg.includes("Google Calendar API error 410") || msg.match(/\b410\b/)) {
            try {
              await updateEvent(event.id, {
                calendarSyncStatus: "removed",
                calendarSyncLabel: "Removed from Google Calendar (already deleted)",
              });
            } catch (e) {
              console.warn("Failed to update calendar sync metadata after Google 410", e);
            }
          } else {
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
      }

      // Preserve notification history by marking them deleted
      await updateNotificationsByEventId(event.id, {
        status: "deleted",
        statusLabel: "Meeting deleted",
      });

      // Soft-delete the event document (deleteEvent performs soft-delete)
      await deleteEvent(event.id);

      if (onRefresh) await onRefresh();

      return { success: true };
    } catch (err) {
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  }

  return {
    actionLoadingId,
    handleComplete,
    handleCancel,
    handleDelete,
  };
}
