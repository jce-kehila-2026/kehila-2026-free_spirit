import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import type { ClientFormInput } from "@/schema/clientSchema";

// Import purely from our Tier 4 Data Layer!
import { subscribeToClients, restoreClientInDb, createClientDoc } from "@/firebase/clientDbService";

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