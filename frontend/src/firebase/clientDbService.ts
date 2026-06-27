import { doc, updateDoc, serverTimestamp, collection, onSnapshot, query, orderBy, getDocs, writeBatch, arrayUnion, arrayRemove, addDoc, setDoc, getDoc, Timestamp, where } from "firebase/firestore";
import { auth, db, storage } from "@/firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import { isClientRole } from "@/firebase/authRoleService";

const CLIENT_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ClientInviteResendState {
  canResend: boolean;
  reason: "expired" | "active" | "claimed" | "missing";
}

// ─── Safety Helpers ───────────────────────────────────────────────────────────

export function getFirestoreDb() {
  if (!db) throw new Error("Firestore DB is not initialized.");
  return db;
}

export function getFirebaseStorage() {
  if (!storage) throw new Error("Firebase Storage is not initialized.");
  return storage;
}

async function isCurrentUserClientRole(): Promise<boolean> {
  const user = auth?.currentUser;

  if (!user) {
    return false;
  }

  const accountSnapshot = await getDoc(doc(getFirestoreDb(), "accounts", user.uid));
  const role = accountSnapshot.exists() ? accountSnapshot.data().role : "";

  return isClientRole(role);
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickClientEditableFields(payload: Record<string, any>): Record<string, any> {
  const clientEditableFields = new Set([
    "first_name",
    "last_name",
    "email",
    "phone",
    "passport_id",
    "gender",
    "address",
    "dob",
    "referrer",
    "education_status",
    "diagnosis",
    "personal_notes",
    "passport_number",
    "passport_country",
    "citizenship",
    "date_of_entry",
    "purpose_of_visit",
    "home_address",
    "cohabitants",
    "dependents",
    "medical_profile",
    "contacts",
    "logistics",
    "questionnaire",
    "legal_consents",
    "financial_aid_applications",
    "client_documents",
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => clientEditableFields.has(key))
  );
}

// ─── Database Operations (Tier 4) ─────────────────────────────────────────────

/**
 * Creates a new client document in Firestore.
 * Tier 4: knows only about DB paths and raw payloads.
 * Called by the Tier 2 application service; never called directly from UI.
 */
export async function createClientDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<void> {
  await addDoc(collection(getFirestoreDb(), "clients"), {
    ...sanitizeFirestorePayload(payload),
    created_at: serverTimestamp(),
  });
}

/**
 * Updates an existing client document in Firestore.
 * This function only knows about database paths and raw payloads.
 */
export async function updateClientDoc(
  clientId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<void> {
  const docRef = doc(getFirestoreDb(), "clients", clientId);
  const isClientUpdate = await isCurrentUserClientRole();

  if (isClientUpdate) {
    // Client onboarding writes must be strict patches. Do not send manager-owned
    // fields or metadata such as status, program_ids, uid, or timestamps because
    // Firestore rules require those values to remain unchanged for client roles.
    await updateDoc(docRef, sanitizeFirestorePayload(pickClientEditableFields(payload)));
    return;
  }

  await updateDoc(docRef, {
    ...sanitizeFirestorePayload(payload),
    updated_at: serverTimestamp(),
  });
}

export async function restoreClientInDb(clientId: string): Promise<void> {
  const docRef = doc(getFirestoreDb(), "clients", clientId);
  await updateDoc(docRef, {
    is_archived: false,
    updated_at: serverTimestamp(),
  });
}

export async function archiveClientInDb(clientId: string): Promise<void> {
  const docRef = doc(getFirestoreDb(), "clients", clientId);
  await updateDoc(docRef, {
    is_archived: true,
    updated_at: serverTimestamp(),
  });
}

/**
 * Creates a pending invite token document for a client onboarding link.
 * The caller supplies the token so the document ID can be embedded in the
 * manager-facing URL without reading sensitive invite state back from Firestore.
 */
export async function createClientInviteDoc(
  clientId: string,
  inviteToken: string
): Promise<void> {
  const expiresAt = Timestamp.fromMillis(Date.now() + CLIENT_INVITE_TTL_MS);

  await setDoc(doc(getFirestoreDb(), "client_invites", inviteToken), {
    clientId,
    status: "pending",
    created_at: serverTimestamp(),
    // Invite claims are rejected after this absolute timestamp by app logic and Firestore rules.
    expiresAt,
  });
}

/**
 * Queues the registration invite email for the Firebase Trigger Email extension.
 * Tier 4 owns only the Firestore payload and collection path; the caller owns
 * when the email should be queued and which invite URL is safe to include.
 */
export async function createClientInviteEmailNotification(
  clientEmailAddress: string,
  inviteUrl: string
): Promise<void> {
  await addDoc(collection(getFirestoreDb(), "automatic_notifications"), {
    to: clientEmailAddress,
    message: {
      subject: "Welcome to Free Spirit! Complete your registration",
      html: `Hello, <br/><br/>Please click the following link to complete your secure onboarding process: <a href="${inviteUrl}">${inviteUrl}</a><br/><br/>Thank you!`,
    },
    createdAt: serverTimestamp(),
    status: "pending",
  });
}

function getTimestampMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const timestampLike = value as { toMillis?: () => number };
    return typeof timestampLike.toMillis === "function" ? timestampLike.toMillis() : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Reads invite state for an admin-controlled resend decision.
 * A resend is allowed only when the newest pending invite has expired and no
 * active pending invite already exists for the same client.
 */
export async function getClientInviteResendState(
  clientId: string
): Promise<ClientInviteResendState> {
  const snapshot = await getDocs(
    query(collection(getFirestoreDb(), "client_invites"), where("clientId", "==", clientId))
  );

  if (snapshot.empty) {
    return { canResend: false, reason: "missing" };
  }

  const invites = snapshot.docs
    .map((inviteDoc) => inviteDoc.data())
    .sort((a, b) => getTimestampMillis(b.created_at) - getTimestampMillis(a.created_at));
  const now = Date.now();
  const hasActivePendingInvite = invites.some(
    (invite) =>
      (!invite.status || invite.status === "pending") &&
      getTimestampMillis(invite.expiresAt) > now
  );

  if (hasActivePendingInvite) {
    return { canResend: false, reason: "active" };
  }

  const latestPendingInvite = invites.find(
    (invite) => !invite.status || invite.status === "pending"
  );

  if (!latestPendingInvite) {
    return { canResend: false, reason: "claimed" };
  }

  return {
    canResend: getTimestampMillis(latestPendingInvite.expiresAt) <= now,
    reason: "expired",
  };
}

/**
 * Subscribes to the clients collection and fires callbacks on data changes.
 * Returns the unsubscribe function to clean up the listener.
 */
export function subscribeToClients(
  onData: (clients: ClientDoc[]) => void,
  onError: (error: Error) => void
) {
  const q = query(collection(getFirestoreDb(), "clients"), orderBy("created_at", "desc"));
  
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
    getFirebaseStorage(),
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

// ─── Programs Integration (Tier 4 — Clients Domain) ──────────────────────────

/**
 * A lightweight snapshot of a program document — only what the
 * ClientProgramsWidget needs to populate the dropdown and enrolled list.
 */
export interface ProgramSummary {
  id: string;
  name: string;
}

/**
 * One-time read of the entire `programs` collection, returning only
 * the `id` and `name` fields needed by the widget dropdown.
 * Mirrors the same pattern the programs page uses to fetch all clients.
 */
export async function fetchAllPrograms(): Promise<ProgramSummary[]> {
  const snapshot = await getDocs(collection(getFirestoreDb(), "programs"));
  return snapshot.docs.map((d) => ({
    id: d.id,
    name: (d.data().name as string) ?? "Unnamed Program",
  }));
}

/**
 * Atomically assigns a client to a program using a Firestore writeBatch.
 *
 * Writes performed in a single commit:
 *   1. `arrayUnion(programId)` → `clients/{clientId}.program_ids`
 *   2. `arrayUnion(clientId)`  → `programs/{programId}.participant_ids`
 *
 * Using arrayUnion means no prior read is needed and duplicate inserts
 * are silently ignored by Firestore.
 */
export async function assignClientToProgram(
  clientId: string,
  programId: string
): Promise<void> {
  const db = getFirestoreDb();
  const batch = writeBatch(db);

  batch.update(doc(db, "clients", clientId), {
    program_ids: arrayUnion(programId),
    updated_at: serverTimestamp(),
  });

  batch.update(doc(db, "programs", programId), {
    participant_ids: arrayUnion(clientId),
  });

  await batch.commit();
}

/**
 * Atomically removes a client from a program using a Firestore writeBatch.
 *
 * Writes performed in a single commit:
 *   1. `arrayRemove(programId)` → `clients/{clientId}.program_ids`
 *   2. `arrayRemove(clientId)`  → `programs/{programId}.participant_ids`
 */
export async function removeClientFromProgram(
  clientId: string,
  programId: string
): Promise<void> {
  const db = getFirestoreDb();
  const batch = writeBatch(db);

  batch.update(doc(db, "clients", clientId), {
    program_ids: arrayRemove(programId),
    updated_at: serverTimestamp(),
  });

  batch.update(doc(db, "programs", programId), {
    participant_ids: arrayRemove(clientId),
  });

  await batch.commit();
}
