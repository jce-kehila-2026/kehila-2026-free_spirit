import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
  
  import { db } from "./firebase";
  
  // Firestore collection reference
  const EVENTS_COLLECTION = "events";
  
  // Create a new event
  export async function createEvent(eventData) {
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
      ...eventData,
      createdAt: serverTimestamp(),
    });
  
    return docRef.id;
  }
  
  // Get all events ordered by date
  export async function getEvents() {
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      orderBy("date", "asc")
    );
  
    const snapshot = await getDocs(eventsQuery);
  
    const now = new Date();
  
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((event) => {
        const eventDateTime = new Date(
          `${event.date}T${event.time}`,
        );

        return (
          eventDateTime > now &&
          event.status === "scheduled"
        );
      });
  }

  // Return all renderable calendar events while preserving historical statuses.
  export async function getCalendarEvents() {
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      orderBy("date", "asc")
    );

    const snapshot = await getDocs(eventsQuery);
    const visibleStatuses = ["scheduled", "completed", "cancelled"];

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((event) => {
        if (!visibleStatuses.includes(event.status)) return false;
        if (
          typeof event.date !== "string" ||
          typeof event.time !== "string" ||
          !event.date.trim() ||
          !event.time.trim()
        ) {
          return false;
        }

        const eventDateTime = new Date(`${event.date}T${event.time}`);
        return !Number.isNaN(eventDateTime.getTime());
      });
  }

  // Return all renderable repository events, including soft-deleted history.
  export async function getMeetingRepositoryEvents() {
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      orderBy("date", "asc")
    );

    const snapshot = await getDocs(eventsQuery);
    const repositoryStatuses = [
      "scheduled",
      "completed",
      "cancelled",
      "deleted",
    ];

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((event) => {
        if (!repositoryStatuses.includes(event.status)) return false;
        if (
          typeof event.date !== "string" ||
          typeof event.time !== "string" ||
          !event.date.trim() ||
          !event.time.trim()
        ) {
          return false;
        }

        const eventDateTime = new Date(event.date + "T" + event.time);
        return !Number.isNaN(eventDateTime.getTime());
      });
  }

  // Return scheduled events within the next `days` days (client-side filter)
  export async function getEventsWithinDays(days) {
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      orderBy("date", "asc")
    );

    const snapshot = await getDocs(eventsQuery);

    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((event) => {
        if (!event.date || !event.time) return false;

        const eventDateTime = new Date(`${event.date}T${event.time}`);

        return (
          eventDateTime >= now &&
          eventDateTime <= until &&
          event.status === "scheduled"
        );
      });
  }

  export async function completeEvent(eventId) {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  
    await updateDoc(eventRef, {
      status: "completed",
    });
  }
  
  export async function cancelEvent(eventId) {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  
    await updateDoc(eventRef, {
      status: "cancelled",
    });
  }
  
  export async function deleteEvent(eventId) {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    // Soft-delete: preserve history in Firestore
    await updateDoc(eventRef, {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  export async function updateEvent(eventId, updatedData) {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  
    await updateDoc(eventRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
  }

  // Read a single event document by id. Returns null if not found.
  export async function getEventById(eventId) {
    try {
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      const snap = await getDoc(eventRef);

      if (!snap.exists()) return null;

      return { id: snap.id, ...snap.data() };
    } catch (err) {
      console.error("getEventById error", err);
      return null;
    }
  }