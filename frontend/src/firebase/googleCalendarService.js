// Browser-side Google Calendar service using Google Identity Services
// Exports: createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

let tokenClient = null;
let accessToken = null;
let accessTokenExpiresAt = 0;

function ensureClientId() {
  if (!CLIENT_ID) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Please add it to your environment.",
    );
  }
}

let gisLoadPromise = null;

export async function ensureGisLoaded() {
  if (typeof window === "undefined") {
    throw new Error("Google Identity Services not available in this environment (server).");
  }

  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return;
  }

  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    // Check if a script tag already exists on the document
    const EXISTING_SRC = "https://accounts.google.com/gsi/client";
    const existingScript = Array.from(document.getElementsByTagName("script")).find((s) => {
      return s.src === EXISTING_SRC || s.src === EXISTING_SRC + ".js" || s.src.endsWith("gsi/client");
    });

    const finish = () => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
      } else {
        reject(new Error("Google Identity Services did not initialize after loading the GIS script."));
      }
    };

    if (existingScript) {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }

      // Wait for it to load or fail
      existingScript.addEventListener("load", finish);
      existingScript.addEventListener("error", () => reject(new Error("Failed to load GIS script from existing script tag.")));
      return;
    }

    // Create a new script tag to load GIS
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.addEventListener("load", () => {
      // small delay may be needed for the library to initialize
      try {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          resolve();
        } else {
          // If the library didn't attach the expected object immediately, poll briefly
          const timeout = setTimeout(() => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
              resolve();
            } else {
              reject(new Error("Google Identity Services loaded but did not initialize properly."));
            }
          }, 50);
          // Also attempt a microtask check
          if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            clearTimeout(timeout);
            resolve();
          }
        }
      } catch {
        reject(new Error("Error while initializing GIS after script load."));
      }
    });

    script.addEventListener("error", () => reject(new Error("Failed to load GIS script (https://accounts.google.com/gsi/client).")));

    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function isGisAvailableSync() {
  if (typeof window === "undefined") return false;
  return Boolean(window.google && window.google.accounts && window.google.accounts.oauth2);
}

function initTokenClient() {
  ensureClientId();
  // ensureGisLoaded may load the GIS script dynamically; make callers await it when necessary
  // For initTokenClient we use a synchronous check only when possible, otherwise throw
  if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) {
    throw new Error("Google Identity Services not available. Callers should await ensureGisLoaded() before initializing token client.");
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          // tokenResponse.expires_in is seconds
          accessTokenExpiresAt = Date.now() + (tokenResponse.expires_in ? tokenResponse.expires_in * 1000 : 55 * 60 * 1000);
        }
      },
    });
  }

  return tokenClient;
}

function requestAccessTokenInteractive() {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureGisLoaded();
      initTokenClient();

      // If we already have a valid token, return it
      if (accessToken && Date.now() < accessTokenExpiresAt - 5000) {
        resolve(accessToken);
        return;
      }

      // The token client uses a callback to populate accessToken; wrap that flow
      const originalCallback = tokenClient.callback;

      tokenClient.callback = (tokenResponse) => {
        try {
          if (!tokenResponse || tokenResponse.error) {
            reject(new Error(tokenResponse && tokenResponse.error ? tokenResponse.error : "Failed to obtain access token."));
            return;
          }

          accessToken = tokenResponse.access_token;
          accessTokenExpiresAt = Date.now() + (tokenResponse.expires_in ? tokenResponse.expires_in * 1000 : 55 * 60 * 1000);
          resolve(accessToken);
        } finally {
          // restore original callback shape for safety
          tokenClient.callback = originalCallback;
        }
      };

      // Request an access token. This may open a popup for user consent and account chooser if needed.
      tokenClient.requestAccessToken({ prompt: "consent select_account" });
    } catch (err) {
      reject(err);
    }
  });
}

async function getAccessToken() {
  ensureClientId();
  await ensureGisLoaded();

  if (accessToken && Date.now() < accessTokenExpiresAt - 5000) {
    return accessToken;
  }

  // Request interactively; callers should be used in user-gesture contexts if needed
  const token = await requestAccessTokenInteractive();
  if (!token) {
    throw new Error("Failed to obtain Google access token.");
  }

  return token;
}

function buildEventPayload(event) {
  // event expects fields: date, time, durationMinutes (optional), title, notes, priority, clientName, reminderLabel, location

  if (!event.date || !event.time) {
    throw new Error("Missing event date or time for Google Calendar event.");
  }

  const start = new Date(`${event.date}T${event.time}`);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid event date/time for Google Calendar event.");
  }

  const duration = Number.isFinite(Number(event.durationMinutes)) && Number(event.durationMinutes) > 0
    ? Number(event.durationMinutes)
    : 60;

  const end = new Date(start.getTime() + duration * 60 * 1000);

  const descriptionParts = [];
  if (event.notes) descriptionParts.push(String(event.notes));
  if (event.clientName) descriptionParts.push(`Participant: ${event.clientName}`);
  if (event.priority) descriptionParts.push(`Priority: ${event.priority}`);
  // Include reminder text only when user opted into reminders. If `addReminder === false`,
  // do not mention reminder timing in the Google Calendar event description.
  if (event.addReminder !== false && (event.reminderLabel || event.reminderOption)) {
    descriptionParts.push(`Reminder: ${event.reminderLabel || event.reminderOption}`);
  }

  const description = descriptionParts.join("\n\n");

  const payload = {
    summary: event.title || "Meeting",
    description: description || undefined,
    start: {
      dateTime: start.toISOString(),
      timeZone: "Asia/Jerusalem",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "Asia/Jerusalem",
    },
  };

  if (event.location) payload.location = event.location;

  // Attach local metadata if available
  if (event.id) {
    payload.extendedProperties = {
      private: {
        localEventId: String(event.id),
      },
    };
  }

  // Add Google Calendar reminder overrides derived from our event reminder settings.
  try {
    // If the user explicitly disabled reminders in the UI/form, ensure we clear any
    // Google Calendar reminders (do not allow calendar default reminders to apply).
    // This respects the `addReminder` boolean carried on the event payload.
    if (event.addReminder === false) {
      payload.reminders = { useDefault: false, overrides: [] };
    } else {
      const PRESET_MINUTES = {
        half_hour_before: 30,
        two_hours_before: 120,
        one_day_before: 1440,
        three_days_before: 4320,
        one_week_before: 10080,
        event_time: 0,
      };

      let minutesBefore = null;

      if (event.reminderMode === "custom") {
        if (event.customReminderDate && event.customReminderTime) {
          const scheduledFor = new Date(`${event.customReminderDate}T${event.customReminderTime}`);
          if (!Number.isNaN(scheduledFor.getTime())) {
            minutesBefore = Math.round((start.getTime() - scheduledFor.getTime()) / 60000);
          }
        }
      } else {
        // preset
        minutesBefore = PRESET_MINUTES[event.reminderOption];
      }

      if (Number.isFinite(minutesBefore) && minutesBefore >= 0) {
        payload.reminders = {
          useDefault: false,
          overrides: [
            {
              method: "popup",
              minutes: minutesBefore,
            },
          ],
        };
      }
    }
  } catch {
    // If reminder conversion fails, do not break event creation/update — skip Google reminders.
    // Intentionally swallow errors here to avoid affecting the primary flow.
  }

  return payload;
}

async function callGoogleCalendarApi(path, method = "GET", body = null) {
  const token = await getAccessToken();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  return await res.json();
}

export async function createGoogleCalendarEvent(event) {
  ensureClientId();
  await ensureGisLoaded();

  const payload = buildEventPayload(event);

  const created = await callGoogleCalendarApi(`/events`, "POST", payload);

  return created; // returns Google event resource
}

export async function updateGoogleCalendarEvent(googleEventId, event) {
  ensureClientId();
  await ensureGisLoaded();

  if (!googleEventId) throw new Error("googleEventId is required to update a Google Calendar event.");

  const payload = buildEventPayload(event);

  const updated = await callGoogleCalendarApi(`/events/${encodeURIComponent(googleEventId)}`, "PATCH", payload);

  return updated;
}

export async function deleteGoogleCalendarEvent(googleEventId) {
  ensureClientId();
  await ensureGisLoaded();

  if (!googleEventId) throw new Error("googleEventId is required to delete a Google Calendar event.");

  await callGoogleCalendarApi(`/events/${encodeURIComponent(googleEventId)}`, "DELETE");

  return true;
}

const googleCalendarService = {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
};

export default googleCalendarService;
