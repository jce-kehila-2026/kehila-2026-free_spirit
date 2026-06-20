import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type ClientDoc } from "@/components/clients/list/ClientList";

// Import purely from our Tier 4 Data Layer!
import { subscribeToClients, restoreClientInDb } from "@/firebase/clientDbService";

export const useClientManagementService = () => {
  const [allDocs, setAllDocs] = useState<ClientDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ClientDoc | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

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
    handleRestore 
  };
};