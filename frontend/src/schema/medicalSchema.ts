import { z } from "zod";
import { MEDICAL_CLEARANCE_STATUS } from "./constants"

// ── Healthcare Provider sub-schema ────────────────────────────────────────────

// HealthcareProvider — one entry in the healthcare_providers[] array.
export const healthcareProviderSchema = z.object({
  name:      z.string().trim().max(100).optional().or(z.literal("")),
  specialty: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, { message: "Enter a valid phone number" })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  facility:  z.string().trim().max(200).optional().or(z.literal("")),
  last_appt: z.string().optional().or(z.literal("")),
});
export type HealthcareProvider = z.infer<typeof healthcareProviderSchema>;


// ── Vaccination sub-schema ─────────────────────────────────────────────────────

/**
 * Vaccination — one entry in the vaccination_history[] array.
 */
export const vaccinationSchema = z.object({
  type:     z.string().trim().max(100).optional().or(z.literal("")),
  received: z.boolean().default(false),
  date:     z.string().optional().or(z.literal("")),
});
export type Vaccination = z.infer<typeof vaccinationSchema>;


// ── Hospitalization sub-schema ─────────────────────────────────────────────────

/**
 * Hospitalization — one entry in the hospitalization_history[] array.
 */
export const hospitalizationSchema = z.object({
  type:        z.string().trim().max(100).optional().or(z.literal("")),
  date:        z.string().optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type Hospitalization = z.infer<typeof hospitalizationSchema>;



// ── Medical Profile ─────────────────────────────────────────────────────────────

/**
 * Medical Profile — nested object under the client document.
 * All fields are optional at the base level.
 */
export const medicalProfileSchema = z.object({
  // ── Insurance & Clearance ────────────────────────────────────────────
  insurance_company:        z.string().trim().max(100).optional().or(z.literal("")),
  policy_number:            z.string().trim().max(50).optional().or(z.literal("")),
  medical_clearance_status: z.enum(MEDICAL_CLEARANCE_STATUS).optional().or(z.literal("")),

  // ── Physical Vitals (stored as strings to support unit annotations) ──
  physical_height:         z.string().trim().max(20).optional().or(z.literal("")),
  physical_weight:         z.string().trim().max(20).optional().or(z.literal("")),
  physical_blood_pressure: z.string().trim().max(30).optional().or(z.literal("")),
  physical_pulse_rate:     z.string().trim().max(20).optional().or(z.literal("")),
  pulse_irregularities:    z.boolean().default(false),

  // ── Screening Booleans ───────────────────────────────────────────────
  uses_narcotics_alcohol:      z.boolean().default(false),
  pending_medical_exams:       z.boolean().default(false),
  trip_for_medical_care:       z.boolean().default(false),
  pending_surgery:             z.boolean().default(false),
  recent_hospitalizations:     z.boolean().default(false),
  medical_air_transport_rider: z.boolean().default(false),

  // ── Numeric / Text Supplements ───────────────────────────────────────
  alcohol_glasses_per_day: z.string().trim().max(10).optional().or(z.literal("")),
  seasickness_meds_pref:   z.string().trim().max(500).optional().or(z.literal("")),

  // ── Medical History (textareas) ──────────────────────────────────────
  allergies:                 z.string().trim().max(500).optional().or(z.literal("")),
  medications:               z.string().trim().max(500).optional().or(z.literal("")),
  dietary_restrictions:      z.string().trim().max(500).optional().or(z.literal("")),
  psychiatric_history:       z.string().trim().max(2000).optional().or(z.literal("")),
  developmental_history:     z.string().trim().max(2000).optional().or(z.literal("")),
  treatment_history_details: z.string().trim().max(2000).optional().or(z.literal("")),
  physical_accommodations:   z.string().trim().max(1000).optional().or(z.literal("")),
  general_accommodations:    z.string().trim().max(1000).optional().or(z.literal("")),

  // ── Conditions Checklist (free-text string array) ────────────────────
  medical_conditions_checklist: z.array(z.string().trim().max(200)).default([]),

  // ── Dynamic Arrays ───────────────────────────────────────────────────
  healthcare_providers:    z.array(healthcareProviderSchema).default([]),
  vaccination_history:     z.array(vaccinationSchema).default([]),
  hospitalization_history: z.array(hospitalizationSchema).default([]),
});

export type MedicalProfile = z.infer<typeof medicalProfileSchema>;


/**
 * Step 2 — Medical Profile.
 */
export const medicalProfileStepSchema = medicalProfileSchema;
export type MedicalProfileFormData = z.infer<typeof medicalProfileStepSchema>;