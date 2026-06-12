import { useState, useEffect } from "react";
import { restoreClient as dbRestore } from "@/application/ClientManagementService";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { type ClientDoc } from "@/components/clients/list/ClientList";

export const useClientManagementService = () => {
  const [allDocs, setAllDocs] = useState<ClientDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ClientDoc | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const q = query(collection(db!, "clients"), orderBy("created_at", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ClientDoc[];
        
        setAllDocs(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error("[ClientManagementService] Core Exception:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleRestore() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      await dbRestore(restoreTarget.id);
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

export async function restoreClient(clientId: string): Promise<void> {
  const docRef = doc(db!, "clients", clientId);
  await updateDoc(docRef, {
    is_archived: false,
    updated_at: serverTimestamp(),
  });
}

export async function archiveClient(clientId: string): Promise<void> {
  const docRef = doc(db!, "clients", clientId);
  await updateDoc(docRef, {
    is_archived: true,
    updated_at: serverTimestamp(),
  });
}