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

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENTS_COLLECTION = "events";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single event document as returned from Firestore.
 * Fields mirror the shape written by ScheduleMeetingForm / eventsService.js.
 */
export interface ClientEvent {
  id: string;
  /** Discriminates between a structured meeting and a freeform note. */
  type?: "meeting" | "note";
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
    // Filter out archived notes locally to avoid needing a composite Firestore index
    .filter((e) => e.archived !== true);
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
  customTime?: string
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
