import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
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
      orderBy("date", "asc"),
    );
  
    const snapshot = await getDocs(eventsQuery);
  
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }