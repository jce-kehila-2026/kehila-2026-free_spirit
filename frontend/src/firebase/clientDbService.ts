import { doc, updateDoc, serverTimestamp, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, storage } from "@/firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Strips undefined values to prevent Firestore from crashing on write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeFirestorePayload(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          return [k, sanitizeFirestorePayload(v)];
        }
        return [k, v];
      })
  );
}

// ─── Database Operations (Tier 4) ─────────────────────────────────────────────

/**
 * Updates an existing client document in Firestore.
 * This function only knows about database paths and raw payloads.
 */
export async function updateClientDoc(
  clientId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<void> {
  const docRef = doc(db!, "clients", clientId);
  
  await updateDoc(docRef, {
    ...sanitizeFirestorePayload(payload),
    updated_at: serverTimestamp(),
  });
}

export async function restoreClientInDb(clientId: string): Promise<void> {
  const docRef = doc(db!, "clients", clientId);
  await updateDoc(docRef, {
    is_archived: false,
    updated_at: serverTimestamp(),
  });
}

export async function archiveClientInDb(clientId: string): Promise<void> {
  const docRef = doc(db!, "clients", clientId);
  await updateDoc(docRef, {
    is_archived: true,
    updated_at: serverTimestamp(),
  });
}

/**
 * Subscribes to the clients collection and fires callbacks on data changes.
 * Returns the unsubscribe function to clean up the listener.
 */
export function subscribeToClients(
  onData: (clients: ClientDoc[]) => void,
  onError: (error: Error) => void
) {
  const q = query(collection(db!, "clients"), orderBy("created_at", "desc"));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ClientDoc[];
      onData(docs);
    },
    (err) => onError(err)
  );
}

/**
 * Uploads a client document to Firebase Storage and reports progress.
 * Returns the final download URL.
 */
export async function uploadClientDocumentFile(
  clientId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(
    storage!,
    `clients/${clientId}/documents/${timestamp}_${file.name}`
  );
  
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress(pct);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}