/**
 * dateUtils.ts — Tier 3 Utility
 *
 * Pure date/time helper functions. No Firebase or React dependencies.
 * These utilities centralise timezone-aware date operations and Firestore
 * timestamp resolution so that Tier 1 components stay free of low-level
 * casting and arithmetic.
 */

// ─── Today String ─────────────────────────────────────────────────────────────

/**
 * Returns the current local calendar date as a YYYY-MM-DD string.
 *
 * Uses explicit local-time fields instead of toISOString() to avoid the
 * UTC-offset shift that causes midnight-crossing bugs.
 */
export function getTodayString(): string {
  const now = new Date();
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

// ─── Current Time String ───────────────────────────────────────────────────────

/**
 * Returns the current local time as an HH:MM string.
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  return (
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`
  );
}

// ─── Firestore Timestamp Resolver ─────────────────────────────────────────────

/** Shape of a Firestore Timestamp as it arrives from the SDK at runtime. */
type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

/**
 * Resolves a raw Firestore timestamp value to a plain JavaScript Date.
 *
 * Handles three cases:
 *  - Real Firestore Timestamp objects (have a .toDate() method)
 *  - Plain objects with a `seconds` numeric epoch field
 *  - Anything else → returns null
 *
 * @param raw - The value stored in event.createdAt / event.updatedAt
 */
export function resolveFirestoreDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== "object") return null;

  const ts = raw as FirestoreTimestampLike;

  if (typeof ts.toDate === "function") {
    return ts.toDate();
  }

  if (typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }

  return null;
}

// ─── Timezone-Safe Date String ────────────────────────────────────────────────

/**
 * Converts a JavaScript Date to a local-timezone YYYY-MM-DD string.
 *
 * toISOString() always returns UTC, which can shift the date by one day for
 * users in UTC+ timezones. This function compensates for that offset.
 */
export function toLocalDateString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().split("T")[0];
}

// ─── Timezone-Safe Time String ────────────────────────────────────────────────

/**
 * Converts a JavaScript Date to a local-timezone HH:MM string.
 */
export function toLocalTimeString(date: Date): string {
  return (
    `${String(date.getHours()).padStart(2, "0")}:` +
    `${String(date.getMinutes()).padStart(2, "0")}`
  );
}
