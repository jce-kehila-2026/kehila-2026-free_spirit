import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/firebase/firebase";
import { auth } from "@/firebase/firebase";
import type { GlobalDocumentTemplate, UploadGlobalTemplateFormData } from "@/schema/documentSchema";

// ─── Safety Helpers ───────────────────────────────────────────────────────────

function getFirestoreDb() {
  if (!db) throw new Error("Firestore DB is not initialized.");
  return db;
}

function getFirebaseStorage() {
  if (!storage) throw new Error("Firebase Storage is not initialized.");
  return storage;
}

// ─── Storage Layer ─────────────────────────────────────────────────────────────

/**
 * Uploads a global template file to Firebase Storage under `global_templates/`.
 * Reports progress via `onProgress` callback.
 * Returns the HTTPS download URL and the storage path on completion.
 *
 * Tier 4: knows only about storage paths and raw file bytes.
 */
export async function uploadGlobalTemplateFile(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ downloadURL: string; storagePath: string }> {
  const timestamp = Date.now();
  const storagePath = `global_templates/${timestamp}_${file.name}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<{ downloadURL: string; storagePath: string }>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(pct);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Deletes a global template file from Firebase Storage by its storage path.
 * Called as part of the compound delete flow alongside the Firestore doc deletion.
 */
export async function deleteGlobalTemplateFile(storagePath: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  await deleteObject(storageRef);
}

// ─── Firestore Layer ───────────────────────────────────────────────────────────

/**
 * Creates a new global document template record in Firestore.
 * Returns the auto-generated Firestore document ID.
 *
 * Tier 4: knows only about collection paths and raw payloads.
 */
export async function createGlobalTemplateDoc(
  formData: UploadGlobalTemplateFormData,
  fileInfo: { downloadURL: string; storagePath: string; fileName: string; fileSize: number }
): Promise<string> {
  const uid = auth?.currentUser?.uid ?? "";

  const docRef = await addDoc(collection(getFirestoreDb(), "global_document_templates"), {
    title: formData.title.trim(),
    description: (formData.description ?? "").trim(),
    category: formData.category,
    file_name: fileInfo.fileName,
    file_url: fileInfo.downloadURL,
    storage_path: fileInfo.storagePath,
    file_size: fileInfo.fileSize,
    uploaded_at: new Date().toISOString(),
    created_by_uid: uid,
    is_active: true,
    created_at: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Soft-deletes a global template by setting `is_active` to false.
 * The Storage file is NOT removed — use deleteGlobalTemplate for full removal.
 */
export async function deactivateGlobalTemplateDoc(templateId: string): Promise<void> {
  const docRef = doc(getFirestoreDb(), "global_document_templates", templateId);
  await updateDoc(docRef, {
    is_active: false,
    updated_at: serverTimestamp(),
  });
}

/**
 * Re-activates a previously deactivated global template by setting `is_active` to true.
 * No file re-upload required — the existing Storage URL is reused.
 */
export async function reactivateGlobalTemplateDoc(templateId: string): Promise<void> {
  const docRef = doc(getFirestoreDb(), "global_document_templates", templateId);
  await updateDoc(docRef, {
    is_active: true,
    updated_at: serverTimestamp(),
  });
}

/**
 * Permanently deletes the Firestore metadata document and removes the file
 * from Firebase Storage in a compound operation.
 * Should only be called after the user has confirmed deletion of an inactive template.
 */
export async function deleteGlobalTemplate(template: GlobalDocumentTemplate): Promise<void> {
  // Remove Firestore record first — if storage delete fails the record is gone
  // which is the safer inconsistency direction (no orphaned UI entries).
  const docRef = doc(getFirestoreDb(), "global_document_templates", template.id);
  await deleteDoc(docRef);

  // Best-effort storage deletion — log but don't throw so the UI can still recover.
  try {
    await deleteGlobalTemplateFile(template.storage_path);
  } catch (err) {
    console.warn("[globalDocumentService] Storage delete failed (file may already be gone):", err);
  }
}

/**
 * Subscribes to all active global document templates ordered by creation date (newest first).
 * Returns the real-time unsubscribe function.
 *
 * Used by the client-facing DocumentsTab to show read-only downloadable templates.
 */
export function subscribeToActiveGlobalTemplates(
  onData: (templates: GlobalDocumentTemplate[]) => void,
  onError: (error: Error) => void
): () => void {
  const q = query(
    collection(getFirestoreDb(), "global_document_templates"),
    where("is_active", "==", true),
    orderBy("created_at", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const templates = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GlobalDocumentTemplate[];
      onData(templates);
    },
    (err) => onError(err)
  );
}

/**
 * Subscribes to ALL global document templates (active + inactive) for the
 * manager's administration view. Returns the real-time unsubscribe function.
 */
export function subscribeToAllGlobalTemplates(
  onData: (templates: GlobalDocumentTemplate[]) => void,
  onError: (error: Error) => void
): () => void {
  const q = query(
    collection(getFirestoreDb(), "global_document_templates"),
    orderBy("created_at", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const templates = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GlobalDocumentTemplate[];
      onData(templates);
    },
    (err) => onError(err)
  );
}
