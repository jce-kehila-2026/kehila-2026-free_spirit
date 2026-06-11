import {
  addDoc,
  collection,
  doc,
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