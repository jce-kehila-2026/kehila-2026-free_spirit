import { z } from "zod";

// ============================================================================
// Enums & Constants
// ============================================================================

const nameRegex = /^[\p{L}\s'-]+$/u;
const nameError = "Name can only contain letters, spaces, hyphens, and apostrophes";

export const CLIENT_STATUS = ["interested", "registered", "draft"] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const GENDER_OPTIONS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const EDUCATION_STATUS_OPTIONS = [
  "none",
  "elementary",
  "high_school",
  "bachelor",
  "master",
  "doctorate",
] as const;
export type EducationStatus = (typeof EDUCATION_STATUS_OPTIONS)[number];

export const MEDICAL_CLEARANCE_STATUS = [
  "pending",
  "approved",
  "denied",
  "expired",
] as const;
export type MedicalClearanceStatus =
  (typeof MEDICAL_CLEARANCE_STATUS)[number];

export const CONTACT_RELATIONSHIP = [
  "parent",
  "spouse",
  "sibling",
  "child",
  "friend",
  "social_worker",
  "other",
] as const;
export type ContactRelationship = (typeof CONTACT_RELATIONSHIP)[number];

// ============================================================================
// Sub-schemas
// ============================================================================

/**
 * Dependent — one entry in the dependents[] array.
 */
export const dependentSchema = z.object({
  name:         z.string().trim().max(100).optional().or(z.literal("")),
  relationship: z.string().trim().max(50).optional().or(z.literal("")),
  dob:          z.string().optional().or(z.literal("")),
});
export type Dependent = z.infer<typeof dependentSchema>;

/**
 * Logistics — program / insurance scheduling fields extracted from legacy PDFs.
 */
export const logisticsSchema = z.object({
  insurance_agent_name:   z.string().trim().max(100).optional().or(z.literal("")),
  insurance_agent_number: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number",
    })
    .optional()
    .or(z.literal("")),
  insurance_period_start: z.string().optional().or(z.literal("")),
  insurance_period_end:   z.string().optional().or(z.literal("")),
  program_consultant:     z.string().trim().max(100).optional().or(z.literal("")),
  program_start_date:     z.string().optional().or(z.literal("")),
});
export type Logistics = z.infer<typeof logisticsSchema>;

/**
 * Questionnaire — open-ended profile-enrichment fields from legacy intake forms.
 */
export const questionnaireSchema = z.object({
  talents_and_skills:    z.string().trim().max(2000).optional().or(z.literal("")),
  community_contribution:z.string().trim().max(2000).optional().or(z.literal("")),
  ideal_roommate:        z.string().trim().max(2000).optional().or(z.literal("")),
  favorite_foods:        z.string().trim().max(500).optional().or(z.literal("")),
  desired_activities:    z.string().trim().max(2000).optional().or(z.literal("")),
  program_worries:       z.string().trim().max(2000).optional().or(z.literal("")),
  main_goals:            z.string().trim().max(2000).optional().or(z.literal("")),
  personal_challenge:    z.string().trim().max(2000).optional().or(z.literal("")),
  staff_assistance:      z.string().trim().max(2000).optional().or(z.literal("")),
  main_strengths:        z.string().trim().max(2000).optional().or(z.literal("")),
  passions:              z.string().trim().max(2000).optional().or(z.literal("")),
  dream_jobs:            z.string().trim().max(2000).optional().or(z.literal("")),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;

/**
 * Legal Consents — release / waiver fields extracted from legacy legal PDF forms.
 */
export const legalConsentsSchema = z.object({
  release_authorizing_person:  z.string().trim().max(200).optional().or(z.literal("")),
  authorized_agencies:         z.array(z.string().trim().max(200)).default([]),
  info_to_disclose:            z.string().trim().max(2000).optional().or(z.literal("")),
  release_reason:              z.string().trim().max(2000).optional().or(z.literal("")),
  release_expiration_date:     z.string().optional().or(z.literal("")),
  release_expiration_event:    z.string().trim().max(500).optional().or(z.literal("")),
  visit_waiver_child_name:     z.string().trim().max(200).optional().or(z.literal("")),
  visit_waiver_signatures:     z.array(z.string().trim().max(200)).default([]),
});
export type LegalConsents = z.infer<typeof legalConsentsSchema>;

/**
 * Medical Profile — nested object under the client document.
 * All fields are optional at the base level; conditional validation
 * enforces required fields when status === "registered".
 */
export const medicalProfileSchema = z.object({
  physician_name: z
    .string()
    .trim()
    .min(2, "Physician name must be at least 2 characters")
    .max(100, "Physician name is too long")
    .regex(/^[\p{L}\s'\-.]+$/u, "Name contains invalid characters")
    .optional()
    .or(z.literal("")),
  physician_phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number (e.g., +1 555-0198 or 050-1234567)",
    })
    .optional()
    .or(z.literal("")),
  allergies: z.string().trim().max(500, "Text is too long").optional().or(z.literal("")),
  medications: z.string().trim().max(500, "Text is too long").optional().or(z.literal("")),
  dietary_restrictions: z.string().trim().max(500, "Text is too long").optional().or(z.literal("")),
  insurance_company: z.string().trim().max(100, "Name is too long").optional().or(z.literal("")),
  policy_number: z.string().trim().max(50, "Policy number is too long").optional().or(z.literal("")),
  medical_clearance_status: z.enum(MEDICAL_CLEARANCE_STATUS).optional().or(z.literal("")),
});

export type MedicalProfile = z.infer<typeof medicalProfileSchema>;

/**
 * Contact — one entry in the contacts[] array.
 * All fields are optional at the base level; conditional validation
 * enforces required fields when status === "registered".
 */
export const contactSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .min(2, "Contact name must be at least 2 characters")
    .max(100, "Contact name is too long")
    .regex(/^[\p{L}\s'\-.]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes"),

  relationship: z.enum(CONTACT_RELATIONSHIP, {
    errorMap: () => ({ message: "Please select a relationship" }),
  }),

  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number (e.g., +1 555-0198 or 050-1234567)",
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email is too long")
    .optional()
    .or(z.literal("")),

  is_emergency_contact: z.boolean().default(false),
});

export type Contact = z.infer<typeof contactSchema>;

// ============================================================================
// Root Client Schema (base — before conditional refinements)
// ============================================================================

const clientBaseSchema = z.object({
  // ── Core identity ──────────────────────────────────────────────────────
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name is too long")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .regex(/[\p{L}]/u, "Name must contain at least one letter")
    .regex(nameRegex, nameError),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name is too long")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .regex(/[\p{L}]/u, "Name must contain at least one letter")
    .regex(nameRegex, nameError),
  email: z
    .string()
    .trim()
    .toLowerCase() // Automatically standardizes the email for the database
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number (e.g., +1 555-0198 or 050-1234567)",
    }),
  status: z.enum(CLIENT_STATUS, {
    errorMap: () => ({ message: "Please select a valid status" }),
  }).or(z.literal("")),

  // ── Registration fields (required only when status === "registered") ──
  passport_id: z
    .string()
    .trim()
    .min(5, "ID is too short (minimum 5 characters)")
    .max(20, "ID is too long")
    .regex(/^[A-Za-z0-9]+$/, "ID can only contain letters and numbers")
    .optional()
    .or(z.literal("")),
  gender: z.enum(GENDER_OPTIONS).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  dob: z
    .string()
    .optional()
    .or(z.literal("")),
  referrer: z.string().trim().max(100).optional().or(z.literal("")),
  education_status: z.enum(EDUCATION_STATUS_OPTIONS).optional().or(z.literal("")),
  program_ids: z.array(z.string()).default([]),
  diagnosis: z
    .string()
    .trim()
    .max(1000, "Diagnosis text is too long")
    .optional()
    .or(z.literal("")),
  personal_notes: z
    .string()
    .trim()
    .max(4000, "Personal notes text is too long")
    .optional()
    .or(z.literal("")),

  // ── Extended demographic fields (from legacy PDF extraction) ───────────
  passport_number:  z.string().trim().max(30).optional().or(z.literal("")),
  passport_country: z.string().trim().max(100).optional().or(z.literal("")),
  citizenship:      z.string().trim().max(100).optional().or(z.literal("")),
  date_of_entry:    z.string().optional().or(z.literal("")),
  purpose_of_visit: z.string().trim().max(500).optional().or(z.literal("")),
  home_address:     z.string().trim().max(300).optional().or(z.literal("")),
  cohabitants:      z.string().trim().max(500).optional().or(z.literal("")),
  dependents:       z.array(dependentSchema).default([]),

  // ── Nested structures ──────────────────────────────────────────────────
  medical_profile: medicalProfileSchema.optional().default({}),
  contacts:        z.array(contactSchema).default([]),
  logistics:       logisticsSchema.optional().default({}),
  questionnaire:   questionnaireSchema.optional().default({}),
  legal_consents:  legalConsentsSchema.optional().default({}),

  // ── Soft-delete flag ───────────────────────────────────────────────────
  is_archived:     z.boolean().default(false).optional(),
});

// ============================================================================
// Conditional Validation via superRefine
// ============================================================================

export const clientSchema = clientBaseSchema.superRefine((data, ctx) => {
  if (data.status !== "registered") return;

  // ── passport_id is strictly mandatory for a registered client ────────
  if (!data.passport_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passport / ID number is required for registered clients",
      path: ["passport_id"],
    });
  }

  // ── DOB is strictly mandatory for a registered client ───────────────
  if (!data.dob) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of birth is required (or the entered date is invalid)",
      path: ["dob"],
    });
  } else {
    // Validate age range and valid date
    const dobDate = new Date(data.dob);
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 120); // Max age 120

    // Check if it's an actual valid date on the calendar
    if (isNaN(dobDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid date of birth",
        path: ["dob"],
      });
    } else if (dobDate > now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date of birth cannot be in the future",
        path: ["dob"],
      });
    } else if (dobDate < minDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid date of birth",
        path: ["dob"],
      });
    }
  }

  // ── Medical Profile is mandatory for registered clients ────────
  // 1. Check Physician Name
  if (!data.medical_profile?.physician_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Physician name is required for registered clients",
      // This path tells react-hook-form exactly which input field to highlight in red
      path: ["medical_profile", "physician_name"],
    });
  }

  // 2. Check Physician Phone
  if (!data.medical_profile?.physician_phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Physician phone is required for registered clients",
      path: ["medical_profile", "physician_phone"],
    });
  }

  // ── Contacts are mandatory for registered clients ────────
  if (data.contacts.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one contact is required to complete registration",
      path: ["contacts"], // This exact path targets your arrayError variable in the UI
    });
  }
});

// ============================================================================
// Derived Types
// ============================================================================

/** Full validated client type (after superRefine) */
export type Client = z.infer<typeof clientSchema>;

/** Raw input type (before validation — useful for react-hook-form defaults) */
export type ClientFormInput = z.input<typeof clientSchema>;

// ============================================================================
// Step-level Schemas (for per-step wizard validation)
// ============================================================================

/**
 * Step 1 — Basic Info.
 * Used for per-step validation in the wizard before the user advances.
 */
export const basicInfoSchema = clientBaseSchema.pick({
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  status: true,
  passport_id: true,
  gender: true,
  address: true,
  dob: true,
  referrer: true,
  education_status: true,
  program_ids: true,
  diagnosis: true,
  personal_notes: true,
  passport_number: true,
  passport_country: true,
  citizenship: true,
  home_address: true,
  cohabitants: true,
  dependents: true,
});

export type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

/**
 * Step 2 — Medical Profile.
 */
export const medicalProfileStepSchema = medicalProfileSchema;
export type MedicalProfileFormData = z.infer<typeof medicalProfileStepSchema>;

/**
 * Step 3 — Contacts.
 */
export const contactsStepSchema = z.object({
  contacts: z.array(contactSchema).default([]),
});

export type ContactsFormData = z.infer<typeof contactsStepSchema>;

// ============================================================================
// Financial Aid Schemas  (dashboard-only — not part of the registration wizard)
// ============================================================================

export const FINANCIAL_AID_STATUS = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "on_hold",
] as const;
export type FinancialAidStatus = (typeof FINANCIAL_AID_STATUS)[number];

/**
 * One financial aid application entry.
 * Stored as an array `financial_aid_applications[]` on the client document.
 */
export const financialAidApplicationSchema = z.object({
  status: z.enum(FINANCIAL_AID_STATUS, {
    errorMap: () => ({ message: "Please select a status" }),
  }),

  requested_amount: z.coerce
    .number({
      invalid_type_error: "Enter a valid number",
    })
    .nonnegative("Amount cannot be negative")
    .max(1_000_000, "Amount seems too large")
    .optional()
    .or(z.literal(0)),

  awarded_amount: z.coerce
    .number({
      invalid_type_error: "Enter a valid number",
    })
    .nonnegative("Amount cannot be negative")
    .max(1_000_000, "Amount seems too large")
    .optional()
    .or(z.literal(0)),

  application_date: z.string().optional().or(z.literal("")),

  review_notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

export type FinancialAidApplication = z.infer<
  typeof financialAidApplicationSchema
>;

/**
 * Tab-level wrapper so useFieldArray has a named key to target.
 */
export const financialAidTabSchema = z.object({
  financial_aid_applications: z
    .array(financialAidApplicationSchema)
    .default([]),
});

export type FinancialAidTabFormData = z.infer<typeof financialAidTabSchema>;

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
