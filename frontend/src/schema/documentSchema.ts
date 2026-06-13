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

export const DOCUMENT_STATUS_OPTIONS = [
  "active",
  "expired",
  "pending_review",
  "rejected",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUS_OPTIONS)[number];

/**
 * One uploaded document entry.
 * Stored as an array `client_documents[]` on the client Firestore document.
 */
export const clientDocumentSchema = z.object({
  document_type:   z.enum(DOCUMENT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select a document type" }),
  }),
  file_name:       z.string().min(1),
  file_url:        z.string().url("Invalid file URL"),
  status:          z.enum(DOCUMENT_STATUS_OPTIONS).default("active"),
  uploaded_at:     z.string().optional().or(z.literal("")),
  expiration_date: z.string().optional().or(z.literal("")),
  manager_notes:   z
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
  document_type:   z.enum(DOCUMENT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select a document type" }),
  }),
  expiration_date: z.string().optional().or(z.literal("")),
  manager_notes:   z.string().trim().max(1000).optional().or(z.literal("")),
});

export type UploadDocumentFormData = z.infer<typeof uploadDocumentFormSchema>;