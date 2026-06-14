import { useState } from "react";

import {
  completeEvent,
  cancelEvent,
  deleteEvent,
  updateEvent,
} from "@/firebase/eventsService";
import { deleteGoogleCalendarEvent, isGisAvailableSync, ensureGisLoaded } from "@/firebase/googleCalendarService";
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
        // If GIS is already available synchronously, attempt interactive removal (may open auth popup).
        if (isGisAvailableSync()) {
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
              console.warn("Failed to remove Google Calendar event", googleErr);
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
        } else {
          // GIS not loaded yet. Preload it in the background for future actions,
          // but do not attempt interactive auth here because loading is async and
          // browsers will block popups if token request is not in the original user gesture.
          ensureGisLoaded().catch(() => {
            // ignore preload errors; we will mark sync as failed below
          });

          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Google Calendar cleanup deferred (GIS not loaded)",
            });
          } catch (e) {
            console.warn("Failed to mark calendar sync as failed when GIS missing", e);
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
        if (isGisAvailableSync()) {
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
              console.warn("Failed to remove Google Calendar event", googleErr);
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
        } else {
          // Preload GIS for future actions, but do not attempt interactive auth here.
          ensureGisLoaded().catch(() => {
            /* ignore */
          });

          try {
            await updateEvent(event.id, {
              calendarSyncStatus: "failed",
              calendarSyncLabel: "Google Calendar cleanup deferred (GIS not loaded)",
            });
          } catch (e) {
            console.warn("Failed to mark calendar sync as failed when GIS missing", e);
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
