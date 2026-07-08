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
  const docs = client.client_documents ?? [];
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. Initialize Form Engine
  const form = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentFormSchema),
    mode: "onTouched",
    defaultValues: {
      document_type: undefined,
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
    const file = selectedFile;

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
        uploaded_at: new Date().toISOString().split("T")[0],
        manager_notes: formData.manager_notes ?? "",
      };

      const updatedDocs = [...(client.client_documents ?? []), newDoc];

      // Tier 2 calling Tier 4: Save Metadata to Firestore
      await updateClientDoc(client.id, {
        client_documents: updatedDocs,
      });

      // Reset UI
      setSelectedFile(null);
      form.reset();
      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (error) {
      console.error("[DocumentsTabController] Upload failed:", error);
      toast.error("Upload failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }, [client.id, client.client_documents, form, selectedFile]);

  // 4. Delete Handler (Bridges to Tier 4)
  const handleDelete = useCallback(async (index: number) => {
    const updated = (client.client_documents ?? []).filter((_, i) => i !== index);
    try {
      await updateClientDoc(client.id, {
        client_documents: updated,
      });
      
      toast.success("Document removed.");
    } catch (err) {
      console.error("[DocumentsTabController] Delete failed:", err);
      toast.error("Could not remove the document. Please try again.");
    }
  }, [client.id, client.client_documents]);

  // 5. Expose strictly what the UI Layer needs
  return {
    form,
    docs,
    uploadState: {
      isLoading,
      uploadProgress,
      fileError,
      setFileError,
      selectedFile,
      setSelectedFile,
    },
    actions: {
      onSubmit,
      handleDelete,
    },
  };
}