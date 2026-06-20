import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirestoreDb } from "@/firebase/clientDbService";
import { resolveFirestoreDate } from "@/utils/dateUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENTS_COLLECTION = "events";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single event document as returned from Firestore.
 * Fields mirror the shape written by ScheduleMeetingForm / eventsService.js.
 */
export interface ClientEvent {
  id: string;
  /** Discriminates between a structured meeting, a freeform note, and a system lifecycle event. */
  type?: "meeting" | "note" | "system";
  clientId: string | null;
  clientName?: string;
  title: string;
  date: string;
  time: string;
  notes?: string;
  /** Body text for type:"note" events. */
  content?: string;
  meetingSummary?: string;
  status: "scheduled" | "completed" | "cancelled" | "deleted" | "note";
  priority: "normal" | "high";
  reminderMode?: string;
  reminderOption?: string;
  googleCalendarEventId?: string;
  calendarSyncLabel?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
  /** When true, the note has been soft-deleted and should not appear in the timeline. */
  archived?: boolean;
  /** The author of the note */
  authorName?: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Fetches all events that belong to the given client, ordered newest-first.
 *
 * This is a "side-car" to eventsService.js: it adds the missing
 * `where("clientId", …)` filter without touching any existing service.
 *
 * NOTE: Firestore requires a composite index on (clientId ASC, createdAt DESC).
 * If the collection is small the SDK will fall back to a client-side sort and
 * log a hint; create the index in the Firebase console when needed.
 */
export async function getEventsByClientId(
  clientId: string
): Promise<ClientEvent[]> {
  const db = getFirestoreDb();

  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClientEvent, "id">),
    }))
    // Filter out archived and deleted records locally to avoid needing
    // additional composite Firestore indexes.
    .filter((e) => e.archived !== true && e.status !== "deleted");
}

// ─── Sort Key (Tier 4 utility) ───────────────────────────────────────────────

/**
 * Returns a Unix timestamp (ms) for chronological sorting of a ClientEvent.
 *
 * Priority order:
 *  1. event.date + event.time fields (set explicitly by the manager)
 *  2. createdAt Firestore timestamp (fallback for legacy records)
 *  3. 0 — floats undatable records to the bottom
 */
export function getEventSortKey(event: ClientEvent): number {
  if (event.date) {
    return new Date(`${event.date}T${event.time || "00:00"}`).getTime();
  }
  const resolved = resolveFirestoreDate(event.createdAt);
  return resolved ? resolved.getTime() : 0;
}

// ─── Note Ingestion (Tier 4) ──────────────────────────────────────────────────

/**
 * Writes a freeform text note to the "events" collection.
 *
 * Tier 4 responsibility: knows only about DB paths and raw payloads.
 * Uses status:"note" so the document is naturally excluded from all
 * meeting-specific read paths (getCalendarEvents, getMeetingRepositoryEvents,
 * getEvents) while still appearing in getEventsByClientId used by TimelineWidget.
 */
export async function createNoteEvent(
  clientId: string,
  clientName: string,
  content: string,
  title?: string,
  customDate?: string,
  customTime?: string,
  authorName?: string
): Promise<string> {
  const db = getFirestoreDb();

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    type: "note",
    clientId,
    clientName,
    title: title || "",   // default to empty string if not provided
    content,
    date: customDate || "",
    time: customTime || "",
    status: "note",            // bypasses all calendar/meeting filter endpoints
    priority: "normal",
    createdAt: serverTimestamp(),
    authorName: authorName || "Unknown Author",
  });

  return docRef.id;
}

/**
 * Writes an automated system event to the "events" collection.
 *
 * Tier 4 responsibility: knows only about DB paths and raw payloads.
 * System events represent lifecycle milestones (e.g. "Client Registered")
 * triggered by the application layer — not authored manually by a user.
 *
 * Uses type:"system" to allow the UI to style them differently in future,
 * and status:"note" so they appear in the timeline via getEventsByClientId
 * without bleeding into meeting/calendar query paths.
 */
export async function createSystemEvent(
  clientId: string,
  clientName: string,
  title: string,
  content: string,
  authorName?: string
): Promise<string> {
  const db = getFirestoreDb();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const timeStr = now.toTimeString().slice(0, 5);   // "HH:MM"

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    type: "system",
    clientId,
    clientName,
    title,
    content,
    date: dateStr,
    time: timeStr,
    status: "note",       // keeps it visible in timeline, hidden from calendar views
    priority: "normal",
    createdAt: serverTimestamp(),
    authorName: authorName || "Unknown Author",
  });

  return docRef.id;
}

/**
 * Updates an existing freeform text note in the "events" collection.
 *
 * Tier 4 responsibility: knows only about DB paths and raw payloads.
 */
export async function updateNoteEvent(
  eventId: string,
  title: string,
  content: string,
  customDate?: string,
  customTime?: string
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(docRef, {
    title,
    content,
    date: customDate || "",
    time: customTime || "",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft-deletes a freeform text note by setting archived:true.
 *
 * Tier 4 responsibility: knows only about DB paths and raw payloads.
 * Archived notes are filtered out by getEventsByClientId so they
 * disappear from the timeline without destroying historical data.
 */
export async function archiveNoteEvent(eventId: string): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(docRef, {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}
