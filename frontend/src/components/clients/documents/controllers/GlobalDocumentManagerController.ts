import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3: Business Rules
import {
  uploadGlobalTemplateFormSchema,
  type UploadGlobalTemplateFormData,
  type GlobalDocumentTemplate,
} from "@/schema/documentSchema";

// Tier 4: Storage / Database
import {
  uploadGlobalTemplateFile,
  createGlobalTemplateDoc,
  deactivateGlobalTemplateDoc,
  reactivateGlobalTemplateDoc,
  deleteGlobalTemplate,
  subscribeToAllGlobalTemplates,
} from "@/firebase/globalDocumentService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB for template documents
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Tier 2: Application Controller for the GlobalDocumentManagerModal.
 * Owns upload flow, progress tracking, and template lifecycle actions.
 * Exposes only what the Tier 1 UI layer needs.
 */
export function useGlobalDocumentManagerController(isOpen: boolean) {
  const [templates, setTemplates] = useState<GlobalDocumentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Form Engine ──────────────────────────────────────────────────────────
  const form = useForm<UploadGlobalTemplateFormData>({
    resolver: zodResolver(uploadGlobalTemplateFormSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      category: "general",
    },
  });

  // ── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToAllGlobalTemplates(
      (data) => {
        setTemplates(data);
        setIsLoadingTemplates(false);
      },
      (err) => {
        console.error("[GlobalDocumentManagerController] subscription error:", err);
        toast.error("Failed to load global templates.");
        setIsLoadingTemplates(false);
      }
    );

    return unsubscribe;
  }, [isOpen]);

  // ── File validation ──────────────────────────────────────────────────────
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPEG, PNG, and WebP files are accepted.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File is too large. Maximum size is 25 MB.";
    }
    return null;
  }

  // ── Upload handler ───────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (formData: UploadGlobalTemplateFormData) => {
      if (!selectedFile) {
        setFileError("Please select a file to upload.");
        return;
      }

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setFileError(validationError);
        return;
      }

      setFileError(null);
      setUploadProgress(0);
      setIsUploading(true);

      try {
        // Tier 2 → Tier 4: upload file to Storage
        const { downloadURL, storagePath } = await uploadGlobalTemplateFile(
          selectedFile,
          (pct) => setUploadProgress(pct)
        );

        // Tier 2 → Tier 4: write metadata to Firestore
        await createGlobalTemplateDoc(formData, {
          downloadURL,
          storagePath,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        });

        setSelectedFile(null);
        form.reset();
        toast.success(`"${formData.title}" uploaded successfully.`);
      } catch (error) {
        console.error("[GlobalDocumentManagerController] upload failed:", error);
        toast.error("Upload failed. Please check your connection and try again.");
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [selectedFile, form]
  );

  // ── Deactivate handler (soft-delete) ─────────────────────────────────────
  const handleDeactivate = useCallback(async (template: GlobalDocumentTemplate) => {
    if (!template.is_active) return;

    const confirmed = window.confirm(
      `Deactivate "${template.title}"? Clients will no longer see this template on their Documents tab. The file is kept in storage.`
    );
    if (!confirmed) return;

    setDeactivatingId(template.id);
    try {
      await deactivateGlobalTemplateDoc(template.id);
      toast.success(`"${template.title}" deactivated.`);
    } catch (error) {
      console.error("[GlobalDocumentManagerController] deactivate failed:", error);
      toast.error("Failed to deactivate template.");
    } finally {
      setDeactivatingId(null);
    }
  }, []);

  // ── Reactivate handler ───────────────────────────────────────────────────
  const handleReactivate = useCallback(async (template: GlobalDocumentTemplate) => {
    if (template.is_active) return;

    setReactivatingId(template.id);
    try {
      await reactivateGlobalTemplateDoc(template.id);
      toast.success(`"${template.title}" reactivated.`);
    } catch (error) {
      console.error("[GlobalDocumentManagerController] reactivate failed:", error);
      toast.error("Failed to reactivate template.");
    } finally {
      setReactivatingId(null);
    }
  }, []);

  // ── Permanent delete handler ─────────────────────────────────────────────
  const handleDelete = useCallback(async (template: GlobalDocumentTemplate) => {
    const confirmed = window.confirm(
      `Permanently delete "${template.title}"? This will remove the file from storage and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(template.id);
    try {
      await deleteGlobalTemplate(template);
      toast.success(`"${template.title}" permanently deleted.`);
    } catch (error) {
      console.error("[GlobalDocumentManagerController] delete failed:", error);
      toast.error("Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return {
    form,
    templates,
    isLoadingTemplates,
    uploadState: {
      isUploading,
      uploadProgress,
      fileError,
      setFileError,
      selectedFile,
      setSelectedFile,
    },
    actions: {
      onSubmit,
      handleDeactivate,
      handleReactivate,
      handleDelete,
    },
    busyState: {
      deactivatingId,
      reactivatingId,
      deletingId,
    },
  };
}
