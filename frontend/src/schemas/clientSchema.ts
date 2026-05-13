import { z } from "zod";

// ============================================================================
// Enums & Constants
// ============================================================================

export const CLIENT_STATUS = ["interested", "registered", "draft"] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const GENDER_OPTIONS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const EDUCATION_STATUS_OPTIONS = [
  "none",
  "elementary",
  "high_school",
  "vocational",
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
  "guardian",
  "social_worker",
  "other",
] as const;
export type ContactRelationship = (typeof CONTACT_RELATIONSHIP)[number];

// ============================================================================
// Sub-schemas
// ============================================================================

/**
 * Medical Profile — nested object under the client document.
 * All fields are optional at the base level; conditional validation
 * enforces required fields when status === "registered".
 */
export const medicalProfileSchema = z.object({
  physician_name: z.string().trim().max(100).optional().or(z.literal("")),
  physician_phone: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-?\d{7}$/, {
      message: "Enter a valid Israeli phone number (e.g. 03-1234567)",
    })
    .optional()
    .or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  medications: z.string().trim().max(500).optional().or(z.literal("")),
  dietary_restrictions: z.string().trim().max(500).optional().or(z.literal("")),
  insurance_company: z.string().trim().max(100).optional().or(z.literal("")),
  policy_number: z.string().trim().max(50).optional().or(z.literal("")),
  medical_clearance_status: z.enum(MEDICAL_CLEARANCE_STATUS).optional(),
});

export type MedicalProfile = z.infer<typeof medicalProfileSchema>;

/**
 * Contact — one entry in the contacts[] array.
 * All fields are optional at the base level; conditional validation
 * enforces required fields when status === "registered".
 */
export const contactSchema = z.object({
  contact_name: z.string().trim().min(1, "Contact name is required").max(100),
  relationship: z.enum(CONTACT_RELATIONSHIP, {
    errorMap: () => ({ message: "Select a valid relationship" }),
  }),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-?\d{7}$/, {
      message: "Enter a valid Israeli phone number (e.g. 050-1234567)",
    }),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
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
    .min(1, "First name is required")
    .max(50),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-?\d{7}$/, {
      message: "Enter a valid Israeli phone number (e.g. 050-1234567)",
    }),
  status: z.enum(CLIENT_STATUS, {
    errorMap: () => ({ message: "Select a valid status" }),
  }),

  // ── Registration fields (required only when status === "registered") ──
  passport_id: z.string().trim().max(20).optional().or(z.literal("")),
  gender: z.enum(GENDER_OPTIONS).optional(),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  dob: z
    .string()
    .optional()
    .or(z.literal("")),
  referrer: z.string().trim().max(100).optional().or(z.literal("")),
  education_status: z.enum(EDUCATION_STATUS_OPTIONS).optional(),
  program_ids: z.array(z.string()).default([]),
  diagnosis: z.string().trim().max(1000).optional().or(z.literal("")),
  personal_notes: z.string().trim().max(2000).optional().or(z.literal("")),

  // ── Nested structures ──────────────────────────────────────────────────
  medical_profile: medicalProfileSchema.optional().default({}),
  contacts: z.array(contactSchema).default([]),
});

// ============================================================================
// Conditional Validation via superRefine
// ============================================================================

export const clientSchema = clientBaseSchema.superRefine((data, ctx) => {
  if (data.status !== "registered") return;

  // ── Only passport_id is strictly mandatory for a registered client ───
  // Address, DOB, physician info, and contacts can be filled out later.
  if (!data.passport_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passport / ID number is required for registered clients",
      path: ["passport_id"],
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
