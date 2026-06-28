import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import type { ClientFormInput } from "@/schema/clientSchema";

// Import purely from our Tier 4 Data Layer!
import {
  subscribeToClients,
  restoreClientInDb,
  createClientDoc,
  updateClientDoc,
  createClientInviteDoc,
  createClientInviteEmailNotification,
  getClientInviteResendState,
  type ClientInviteResendState,
  trackArrival,
  trackDeparture,
  manageStay,
  getFirestoreDb,
} from "@/firebase/clientDbService";
import { createSystemEvent } from "@/firebase/clientEventsService";
import { doc, getDoc } from "firebase/firestore";

/**
 * Application Layer (Tier 2) — Client Management Service.
 *
 * Orchestrates data flow between Tier 4 (Firestore) and Tier 1 (UI).
 * Owns: user-visible feedback (toast), loading states, and business-level
 * sequencing. Does NOT contain presentation markup or Firestore SDK calls.
 */
export const useClientManagementService = () => {
  const [allDocs, setAllDocs] = useState<ClientDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ClientDoc | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);

  useEffect(() => {
    // Tier 2 calling Tier 4 listener
    const unsubscribe = subscribeToClients(
      (docs) => {
        setAllDocs(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error("[ClientManagementService] Core Exception:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  /**
   * Creates a new "interested" client record.
   * Tier 2 responsibility: toast feedback, loading state, error boundary.
   * Delegates the actual Firestore write to Tier 4 (createClientDoc).
   */
  async function saveNewClient(data: ClientFormInput): Promise<void> {
    setIsSavingNewClient(true);
    try {
      // Tier 2 calling Tier 4 database mutation
      await createClientDoc(data);

      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
        "Contact";
      toast.success(`"${displayName}" saved as an Interested Contact.`);
    } catch (err) {
      console.error("[ClientManagementService] saveNewClient failed:", err);
      toast.error(
        "Failed to save the client record. Please check your connection and try again."
      );
      // Re-throw so the intake form can react (e.g. keep the form open)
      throw err;
    } finally {
      setIsSavingNewClient(false);
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    
    try {
      // Tier 2 calling Tier 4 database mutation
      await restoreClientInDb(restoreTarget.id);
      toast.success(`${restoreTarget.first_name} ${restoreTarget.last_name} restored successfully.`);
      setRestoreTarget(null);
    } catch {
      toast.error("Failed to restore client");
    } finally {
      setIsRestoring(false);
    }
  }

  return { 
    allDocs, 
    isLoading, 
    error, 
    restoreTarget,
    setRestoreTarget,
    isRestoring,
    handleRestore,
    saveNewClient,
    isSavingNewClient,
  };
};

// ─── Standalone Orchestration Functions (Tier 2) ───────────────────────────────
// These are plain async functions rather than hook-internal methods because they
// are called from individual profile pages and do not need shared hook state.

// Admin invite dispatch is the only browser-side status transition: interested -> invited.
type UpdatableStatus = "invited";

const STATUS_COPY: Record<
  UpdatableStatus,
  { eventTitle: string; eventBody: (name: string, managerName: string) => string; successToast: (name: string) => string }
> = {
  invited: {
    eventTitle: "Client Invited",
    eventBody: (name, managerName) => `${name} was invited to complete onboarding by ${managerName}.`,
    successToast: (name) => `${name} has been invited to complete onboarding.`,
  },
};

/**
 * Updates a client's journey status and writes a system timeline milestone.
 *
 * Handles both forward (interested → registered) and backward
 * (registered → interested) transitions from a single function.
 *
 * Tier 2 responsibility: orchestrates two concurrent Tier 4 writes, owns
 * toast feedback, and re-throws on failure so the caller can react.
 *
 * @param clientId    - Firestore document ID of the client.
 * @param clientName  - Display name used in the timeline event body.
 * @param newStatus   - The target status to transition the client to.
 * @param managerName - The name of the manager performing the action.
 */
export async function updateClientStatus(
  clientId: string,
  clientName: string,
  newStatus: UpdatableStatus,
  managerName: string
): Promise<void> {
  const copy = STATUS_COPY[newStatus];
  try {
    // Run the status update and the timeline event write concurrently.
    // Either can fail independently — Promise.all will throw if either rejects.
    await Promise.all([
      // Tier 4: update the status field on the client document
      updateClientDoc(clientId, { status: newStatus }),

      // Tier 4: add a lifecycle milestone entry to the activity timeline
      createSystemEvent(
        clientId,
        clientName,
        copy.eventTitle,
        copy.eventBody(clientName, managerName),
        managerName
      ),
    ]);

    toast.success(copy.successToast(clientName));
  } catch (err) {
    console.error("[ClientManagementService] updateClientStatus failed:", err);
    toast.error("Status update failed. Please check your connection and try again.");
    // Re-throw so the caller (Tier 1) can reset its loading state for retry.
    throw err;
  }
}

/**
 * Backward-compatible alias — existing callers of registerClient() continue
 * to work without modification while new code uses updateClientStatus directly.
 */
export async function registerClient(
  clientId: string,
  clientName: string
): Promise<void> {
  return updateClientStatus(clientId, clientName, "invited", "System");
}

function createSecureInviteToken(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Secure token generation is not available in this browser.");
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a one-time client invite URL and persists the token document.
 *
 * Tier 2 responsibility: owns the workflow contract and user feedback.
 * Tier 4 responsibility: performs the Firestore write in createClientInviteDoc.
 */
export async function createClientInviteLink(
  clientId: string,
  origin: string
): Promise<string> {
  if (!clientId) {
    throw new Error("A client ID is required to generate an invite link.");
  }

  const inviteToken = createSecureInviteToken();
  await createClientInviteDoc(clientId, inviteToken);

  return `${origin}/signup?inviteToken=${inviteToken}`;
}

/**
 * Creates the secure onboarding invite and queues delivery through Firestore.
 *
 * The invite-token algorithm and signup URL remain owned by createClientInviteLink;
 * this workflow only changes the delivery channel from manual copy to email queue.
 */
export async function queueClientRegistrationInviteEmail(
  clientId: string,
  clientEmailAddress: string | undefined,
  origin: string
): Promise<void> {
  const normalizedEmail = clientEmailAddress?.trim();

  if (!normalizedEmail) {
    throw new Error("A client email address is required to queue an invitation.");
  }

  const inviteUrl = await createClientInviteLink(clientId, origin);
  await createClientInviteEmailNotification(normalizedEmail, inviteUrl);
  toast.success("Invitation email queued successfully!");
}

export async function getClientRegistrationInviteResendState(
  clientId: string
): Promise<ClientInviteResendState> {
  return getClientInviteResendState(clientId);
}

// ─── Client Stays (Tier 2) ──────────────────────────────────────────────────

export async function trackClientArrival(
  clientId: string,
  clientName: string,
  managerName: string,
  arrivalDateStr?: string
): Promise<void> {
  try {
    await trackArrival(clientId, clientName, managerName, arrivalDateStr);
    toast.success(`${clientName} has been marked as arrived.`);
  } catch (err) {
    console.error("[ClientManagementService] trackClientArrival failed:", err);
    toast.error("Failed to track arrival. Please check your connection and try again.");
    throw err;
  }
}

export async function trackClientDeparture(
  clientId: string,
  clientName: string,
  managerName: string,
  departureDateStr?: string
): Promise<void> {
  try {
    await trackDeparture(clientId, clientName, managerName, departureDateStr);
    toast.success(`${clientName} has been marked as departed.`);
  } catch (err) {
    console.error("[ClientManagementService] trackClientDeparture failed:", err);
    toast.error(err instanceof Error ? err.message : "Failed to track departure. Please check your connection and try again.");
    throw err;
  }
}

export async function manageClientStay(
  clientId: string,
  stayIndex: number,
  newArrivalDate: string,
  newDepartureDate: string | null,
  deleteRecord: boolean
): Promise<void> {
  try {
    if (!deleteRecord && newDepartureDate && new Date(newDepartureDate) < new Date(newArrivalDate)) {
      throw new Error("Departure date cannot be before arrival date.");
    }
    await manageStay(clientId, stayIndex, newArrivalDate, newDepartureDate, deleteRecord);
    toast.success(deleteRecord ? "Stay record deleted." : "Stay updated successfully.");
  } catch (err) {
    console.error("[ClientManagementService] manageClientStay failed:", err);
    toast.error(err instanceof Error ? err.message : "Failed to manage stay.");
    throw err;
  }
}

// Backward compatibility for UI components that haven't been updated yet
export async function manageClientRecentStay(
  clientId: string,
  newArrivalDate: string,
  newDepartureDate: string | null | undefined,
  deleteRecord: boolean
): Promise<void> {
  const db = getFirestoreDb();
  const clientSnap = await getDoc(doc(db, "clients", clientId));
  if (!clientSnap.exists()) throw new Error("Client not found");
  
  const stays = clientSnap.data().stays || [];
  if (stays.length === 0) throw new Error("No stay found");
  
  await manageClientStay(clientId, stays.length - 1, newArrivalDate, newDepartureDate || null, deleteRecord);
}
