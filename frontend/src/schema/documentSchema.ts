import { z } from "zod";

// ============================================================================
// Client Document Schemas  (dashboard-only — not part of the registration wizard)
// ============================================================================

export const DOCUMENT_TYPE_OPTIONS = [
  "passport",
  "medical_waiver",
  "consent_form",
  "insurance_card",
  "prescription",
  "referral_letter",
  "financial_aid_form",
  "id_card",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPE_OPTIONS)[number];


/**
 * One uploaded document entry.
 * Stored as an array `client_documents[]` on the client Firestore document.
 */
export const clientDocumentSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select a document type" }),
  }),
  file_name:    z.string().min(1),
  file_url:     z.string().url("Invalid file URL"),
  uploaded_at:  z.string().optional().or(z.literal("")),
  manager_notes: z
    .string()
    .trim()
    .max(1000, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

export type ClientDocument = z.infer<typeof clientDocumentSchema>;

/**
 * Form data for the upload section only
 * (file_url / file_name are filled programmatically after the Storage upload).
 */
export const uploadDocumentFormSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select a document type" }),
  }),
  manager_notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type UploadDocumentFormData = z.infer<typeof uploadDocumentFormSchema>;

// ============================================================================
// Global Document Template Schemas
// (manager-uploaded master forms visible to all clients as read-only downloads)
// ============================================================================

export const GLOBAL_DOCUMENT_CATEGORY_OPTIONS = [
  "general",
  "medical",
  "legal",
  "financial",
  "consent",
  "intake",
  "other",
] as const;

export type GlobalDocumentCategory = (typeof GLOBAL_DOCUMENT_CATEGORY_OPTIONS)[number];

/**
 * Metadata for one global template document.
 * Stored as a top-level Firestore document in `global_document_templates/{id}`.
 */
export const globalDocumentTemplateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  category: z.enum(GLOBAL_DOCUMENT_CATEGORY_OPTIONS),
  file_name: z.string().min(1),
  file_url: z.string().url(),
  storage_path: z.string().min(1),
  file_size: z.number().nonnegative(),
  uploaded_at: z.string(),
  created_by_uid: z.string().min(1),
  is_active: z.boolean(),
});

export type GlobalDocumentTemplate = z.infer<typeof globalDocumentTemplateSchema>;

/**
 * Form shape for the "Upload new template" form inside GlobalDocumentManagerModal.
 * `file_url`, `file_name`, `storage_path`, and `file_size` are populated
 * programmatically after the Storage upload completes.
 */
export const uploadGlobalTemplateFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.enum(GLOBAL_DOCUMENT_CATEGORY_OPTIONS, {
    errorMap: () => ({ message: "Please select a category" }),
  }),
});

export type UploadGlobalTemplateFormData = z.infer<typeof uploadGlobalTemplateFormSchema>;