import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import type { ClientFormInput } from "@/schema/clientSchema";

// Import purely from our Tier 4 Data Layer!
import { subscribeToClients, restoreClientInDb, createClientDoc, updateClientDoc } from "@/firebase/clientDbService";
import { createSystemEvent } from "@/firebase/clientEventsService";

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

// Copy map (Tier 3 business rule): all human-readable strings derived from the
// target status so the orchestration function stays data-driven and DRY.
type UpdatableStatus = "registered" | "interested";

const STATUS_COPY: Record<
  UpdatableStatus,
  { eventTitle: string; eventBody: (name: string, managerName: string) => string; successToast: (name: string) => string }
> = {
  registered: {
    eventTitle: "Client Registered",
    eventBody: (name, managerName) => `${name} was officially registered in the system by ${managerName}.`,
    successToast: (name) => `${name} has been successfully registered.`,
  },
  interested: {
    eventTitle: "Status Reverted to Interested",
    eventBody: (name, managerName) => `${name}'s status was reverted to Interested by ${managerName}.`,
    successToast: (name) => `${name} has been reverted to Interested.`,
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
  return updateClientStatus(clientId, clientName, "registered", "System");
}