import { z } from "zod";

import { nameRegex, nameError, CLIENT_STATUS, GENDER_OPTIONS, EDUCATION_STATUS_OPTIONS } from "./constants"
import { medicalProfileSchema } from "./medicalSchema"
import { contactSchema } from "./contactSchema"
import { dependentSchema, logisticsSchema, questionnaireSchema, legalConsentsSchema } from "./supplementarySchema"

// ============================================================================
// Stays Schema
// ============================================================================

export const staySchema = z.object({
  arrivedAt: z.string(),
  arrivalEventId: z.string().optional(),
  departedAt: z.string().nullable(),
  departureEventId: z.string().optional(),
});
export type Stay = z.infer<typeof staySchema>;

// ============================================================================
// Root Client Schema (base)
// ============================================================================

const clientBaseSchema = z.object({
  // Core identity — required for all records to avoid "ghost" entries.
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .regex(/[\p{L}]/u, "Name must contain at least one letter")
    .regex(nameRegex, nameError),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .regex(/[\p{L}]/u, "Name must contain at least one letter")
    .regex(nameRegex, nameError),
  email: z
    .string()
    .trim()
    .toLowerCase() // Automatically standardizes the email for the database
    .min(1, "Email address is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number (e.g., +1 555-0198 or 050-1234567)",
    }),
  status: z.enum(CLIENT_STATUS, {
    errorMap: () => ({ message: "Please select a valid status" }),
  }).or(z.literal("")),

  // Registration fields
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
  dob: z.string().optional().or(z.literal("")),
  referrer: z.string().trim().max(100).optional().or(z.literal("")),
  education_status: z.enum(EDUCATION_STATUS_OPTIONS).optional().or(z.literal("")),
  program_ids: z.array(z.string()).default([]),
  diagnosis: z.string().trim().max(1000, "Diagnosis text is too long").optional().or(z.literal("")),
  personal_notes: z.string().trim().max(4000, "Personal notes text is too long").optional().or(z.literal("")),

  // Legacy demographics
  passport_number: z.string().trim().max(30).optional().or(z.literal("")),
  passport_country: z.string().trim().max(100).optional().or(z.literal("")),
  citizenship: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_entry: z.string().optional().or(z.literal("")),
  purpose_of_visit: z.string().trim().max(500).optional().or(z.literal("")),
  home_address: z.string().trim().max(300).optional().or(z.literal("")),
  cohabitants: z.string().trim().max(500).optional().or(z.literal("")),
  dependents: z.array(dependentSchema).default([]),

  // Nested structures (Imported)
  medical_profile: medicalProfileSchema.optional().default({}),
  contacts: z.array(contactSchema).default([]),
  logistics: logisticsSchema.optional().default({}),
  questionnaire: questionnaireSchema.optional().default({}),
  legal_consents: legalConsentsSchema.optional().default({}),
  stays: z.array(staySchema).default([]),

  // Soft-delete flag
  is_archived: z.boolean().default(false).optional(),
});

// ============================================================================
// Conditional Validation via superRefine (Tier 3 Business Logic)
// ============================================================================

export const clientSchema = clientBaseSchema.superRefine((data, ctx) => {
  // If a contact card was added, its name and phone are required.
  // Adding a contact card at all is optional.
  data.contacts.forEach((contact, index) => {
    const name = typeof contact.contact_name === "string" ? contact.contact_name.trim() : "";
    const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";

    if (!name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact name is required",
        path: ["contacts", index, "contact_name"],
      });
    }
    if (!phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required",
        path: ["contacts", index, "phone"],
      });
    }
  });
});

export type Client = z.infer<typeof clientSchema>;
export type ClientFormInput = z.input<typeof clientSchema>;

// ============================================================================
// Step-level Schemas (kept for backward compatibility with profile tabs)
// ============================================================================

// Basic Info fields (used by profile tabs that edit existing clients)
export const basicInfoSchema = clientBaseSchema.pick({
  first_name: true, last_name: true, email: true, phone: true, status: true,
  passport_id: true, gender: true, address: true, dob: true, referrer: true,
  education_status: true, program_ids: true, diagnosis: true, personal_notes: true,
  passport_number: true, passport_country: true, citizenship: true, home_address: true,
  cohabitants: true, dependents: true,
});
export type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

export type { FinancialAidApplication } from "./financialAidSchema";
export type { ClientDocument } from "./documentSchema";

// ============================================================================
// Global Domain Re-exports (Fixes all Tab file imports instantly)
// ============================================================================

// From Shared Constants
export { 
  CLIENT_STATUS, 
  GENDER_OPTIONS, 
  EDUCATION_STATUS_OPTIONS, 
  MEDICAL_CLEARANCE_STATUS, 
  CONTACT_RELATIONSHIP 
} from "../schema/constants";
export type { 
  ClientStatus, 
  Gender, 
  EducationStatus, 
  MedicalClearanceStatus, 
  ContactRelationship 
} from "../schema/constants";

// From Contacts Domain
export { contactSchema, contactsStepSchema } from "../schema/contactSchema";
export type { Contact, ContactsFormData } from "../schema/contactSchema";

// From Medical Domain
export { 
  healthcareProviderSchema, 
  vaccinationSchema, 
  hospitalizationSchema, 
  medicalProfileSchema, 
  medicalProfileStepSchema 
} from "../schema/medicalSchema";
export type { 
  MedicalProfile, 
  HealthcareProvider, 
  Vaccination, 
  Hospitalization, 
  MedicalProfileFormData 
} from "../schema/medicalSchema";

// From Financial Domain
export { 
  FINANCIAL_AID_STATUS, 
  paymentInstallmentSchema, 
  financialAidApplicationSchema, 
  financialAidTabSchema 
} from "../schema/financialAidSchema";
export type { 
  FinancialAidStatus, 
  PaymentInstallment, 
  FinancialAidTabFormData 
} from "../schema/financialAidSchema";

// From Document Domain
export { 
  DOCUMENT_TYPE_OPTIONS, 
  clientDocumentSchema, 
  uploadDocumentFormSchema 
} from "../schema/documentSchema";
export type { 
  UploadDocumentFormData 
} from "../schema/documentSchema";

// From Auxiliary / Legacy Domain
export { dependentSchema, logisticsSchema, questionnaireSchema, legalConsentsSchema } from "./supplementarySchema";
export type { Dependent, Logistics, Questionnaire, LegalConsents } from "./supplementarySchema";