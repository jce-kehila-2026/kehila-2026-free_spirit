import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import { 
  uploadDocumentFormSchema, 
  type UploadDocumentFormData, 
  type ClientDocument 
} from "@/schema/documentSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database / Storage Layer)
import { updateClientDoc, uploadClientDocumentFile } from "@/firebase/clientDbService";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/**
 * Tier 2: Application Controller for the Documents Tab.
 * Manages file validation, upload progress streams, and optimistic UI updates.
 */
export function useDocumentsTabController(client: ClientDoc) {
  // Local copy for optimistic UI updates (no page refresh needed)
  const [docs, setDocs] = useState<ClientDocument[]>(client.client_documents ?? []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // 1. Initialize Form Engine
  const form = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentFormSchema),
    mode: "onTouched",
    defaultValues: {
      document_type: undefined,
      expiration_date: "",
      manager_notes: "",
    },
  });

  // 2. File Validation
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPEG, PNG, WebP, and HEIC files are accepted.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File is too large. Maximum size is 10 MB.";
    }
    return null;
  }

  // 3. Upload Handler (Bridges to Tier 4)
  const onSubmit = useCallback(async (formData: UploadDocumentFormData) => {
    const fileInput = document.getElementById("doc-file-input") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      setFileError("Please select a file to upload.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError(null);
    setUploadProgress(0);
    setIsLoading(true);

    try {
      // Tier 2 calling Tier 4: Upload File to Storage
      const downloadURL = await uploadClientDocumentFile(client.id, file, (pct) => {
        setUploadProgress(pct);
      });

      // Build metadata record
      const newDoc: ClientDocument = {
        document_type: formData.document_type,
        file_name: file.name,
        file_url: downloadURL,
        status: "active",
        uploaded_at: new Date().toISOString().split("T")[0],
        expiration_date: formData.expiration_date ?? "",
        manager_notes: formData.manager_notes ?? "",
      };

      const updatedDocs = [...docs, newDoc];

      // Tier 2 calling Tier 4: Save Metadata to Firestore
      await updateClientDoc(client.id, {
        client_documents: updatedDocs,
      });

      // Update local state & reset UI
      setDocs(updatedDocs);
      form.reset();
      if (fileInput) fileInput.value = "";
      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (error) {
      console.error("[DocumentsTabController] Upload failed:", error);
      toast.error("Upload failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }, [client.id, docs, form]);

  // 4. Delete Handler (Bridges to Tier 4)
  const handleDelete = useCallback(async (index: number) => {
    const updated = docs.filter((_, i) => i !== index);
    try {
      await updateClientDoc(client.id, {
        client_documents: updated,
      });
      
      setDocs(updated);
      toast.success("Document removed.");
    } catch (err) {
      console.error("[DocumentsTabController] Delete failed:", err);
      toast.error("Could not remove the document. Please try again.");
    }
  }, [client.id, docs]);

  // 5. Expose strictly what the UI Layer needs
  return {
    form,
    docs,
    uploadState: {
      isLoading,
      uploadProgress,
      fileError,
      setFileError,
    },
    actions: {
      onSubmit,
      handleDelete,
    },
  };
}