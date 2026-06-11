import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
    notifications.map((notification) => createNotification(notification)),
  );
}

export async function getNotifications() {
  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    orderBy("scheduledFor", "asc"),
  );

  const snapshot = await getDocs(notificationsQuery);
  const now = new Date();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((notification) => {
      const reminderDateTime = new Date(notification.scheduledFor);

      return (
        reminderDateTime > now &&
        notification.status === "pending"
      );
    });
}

// Return due notifications (pending and scheduledFor <= now)
export async function getDueNotifications() {
  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    orderBy("scheduledFor", "asc"),
  );

  const snapshot = await getDocs(notificationsQuery);
  const now = new Date();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((notification) => {
      if (!notification.scheduledFor) return false;

      const reminderDateTime = new Date(notification.scheduledFor);

      return (
        reminderDateTime <= now &&
        notification.status === "pending"
      );
    });
}

// Return upcoming notifications within N days (inclusive)
export async function getUpcomingNotificationsWithinDays(days) {
  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    orderBy("scheduledFor", "asc"),
  );

  const snapshot = await getDocs(notificationsQuery);
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((notification) => {
      if (!notification.scheduledFor) return false;

      const reminderDateTime = new Date(notification.scheduledFor);

      return (
        reminderDateTime >= now &&
        reminderDateTime <= until &&
        notification.status === "pending"
      );
    });
}

export async function updateNotificationsByEventId(eventId, updateData) {
  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("eventId", "==", eventId),
  );

  const snapshot = await getDocs(notificationsQuery);

  await Promise.all(
    snapshot.docs.map((notificationDoc) =>
      updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationDoc.id), updateData),
    ),
  );
}

export async function deleteNotificationsByEventId(eventId) {
  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("eventId", "==", eventId),
  );

  const snapshot = await getDocs(notificationsQuery);

  await Promise.all(
    snapshot.docs.map((notificationDoc) =>
      deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationDoc.id)),
    ),
  );
}

// Update a single notification by id
export async function updateNotificationById(notificationId, updateData) {
  const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);

  await updateDoc(notificationRef, updateData);
}