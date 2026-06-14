import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/firebase/clientDbService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodoDoc {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: ReturnType<typeof serverTimestamp> | null;
  clientId: string | null;
}

// ─── Tier 3: Database Operations ──────────────────────────────────────────────

/**
 * Fetches all todos for a given clientId, or todos with clientId === null
 * when no clientId is provided (general onboarding todos).
 * Results are sorted newest-first.
 */
export async function fetchTodos(clientId?: string): Promise<TodoDoc[]> {
  const db = getFirestoreDb();
  const todosRef = collection(db, "todos");

  const q = query(
    todosRef,
    where("clientId", "==", clientId ?? null),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<TodoDoc, "id">),
  }));
}

/**
 * Adds a new todo document to Firestore.
 * Attaches the given clientId (or null for global/onboarding todos).
 */
export async function addTodo(
  text: string,
  clientId?: string
): Promise<string> {
  const db = getFirestoreDb();
  const docRef = await addDoc(collection(db, "todos"), {
    text: text.trim(),
    isCompleted: false,
    createdAt: serverTimestamp(),
    clientId: clientId ?? null,
  });
  return docRef.id;
}

/**
 * Toggles the completion status of a single todo.
 */
export async function toggleTodoCompletion(
  todoId: string,
  currentStatus: boolean
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, "todos", todoId);
  await updateDoc(docRef, { isCompleted: !currentStatus });
}

/**
 * Permanently deletes a todo document from Firestore.
 */
export async function deleteTodo(todoId: string): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, "todos", todoId);
  await deleteDoc(docRef);
}
