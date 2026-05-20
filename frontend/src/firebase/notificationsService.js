import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
  } from "firebase/firestore";
  
  import { db } from "./firebase";
  
  const NOTIFICATIONS_COLLECTION = "automatic_notifications";
  
  export async function createNotification(notificationData) {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notificationData,
      createdAt: serverTimestamp(),
    });
  }

  export async function createNotifications(notifications) {
    await Promise.all(
      notifications.map((notification) =>
        createNotification(notification),
      ),
    );
  }
  
  export async function getNotifications() {
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy("createdAt", "desc"),
    );
  
    const snapshot = await getDocs(notificationsQuery);
  
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }