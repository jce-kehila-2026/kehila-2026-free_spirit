import { z } from "zod";

// ── Healthcare Provider sub-schema ────────────────────────────────────────────

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


// ── Allergy sub-schema (dynamic array) ────────────────────────────────────────

export const allergySchema = z.object({
  allergen:           z.string().trim().max(200).optional().or(z.literal("")),
  reaction_severity:  z.string().trim().max(200).optional().or(z.literal("")),
});
export type Allergy = z.infer<typeof allergySchema>;


// ── Medication sub-schema (dynamic array) ─────────────────────────────────────

export const medicationSchema = z.object({
  name:      z.string().trim().max(200).optional().or(z.literal("")),
  frequency: z.string().trim().max(100).optional().or(z.literal("")),
  dose:      z.string().trim().max(100).optional().or(z.literal("")),
  route:     z.string().trim().max(100).optional().or(z.literal("")),
  condition: z.string().trim().max(200).optional().or(z.literal("")),
});
export type Medication = z.infer<typeof medicationSchema>;


// ── Hospitalization sub-schema (dynamic array, type is now an enum) ───────────

export const HOSPITALIZATION_TYPES = ["Hospitalization", "Major Illness", "Injury"] as const;
export type HospitalizationType = (typeof HOSPITALIZATION_TYPES)[number];

export const hospitalizationSchema = z.object({
  type:        z.enum(HOSPITALIZATION_TYPES).optional().or(z.literal("")),
  date:        z.string().optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type Hospitalization = z.infer<typeof hospitalizationSchema>;


// ── Seasickness Medications ───────────────────────────────────────────────────

export const seasicknessMedsSchema = z.object({
  not_able_to_take: z.boolean().default(false),
  bringing_own_for_personal_use: z.boolean().default(false),
  can_take_if_necessary: z.boolean().default(false),
  can_take_any_if_needed: z.boolean().default(false),
  specify_if_needed: z.string().trim().max(500).optional().or(z.literal("")),
});
export type SeasicknessMeds = z.infer<typeof seasicknessMedsSchema>;

export const DEFAULT_SEASICKNESS_MEDS: SeasicknessMeds = {
  not_able_to_take: false,
  bringing_own_for_personal_use: false,
  can_take_if_necessary: false,
  can_take_any_if_needed: false,
  specify_if_needed: "",
};


// ── Vaccination history — hardcoded 11-vaccine object ─────────────────────────

export const VACCINATION_STATUS_OPTIONS = ["Yes", "No", "Not Sure"] as const;
export type VaccinationStatus = (typeof VACCINATION_STATUS_OPTIONS)[number];

const vaccinationEntrySchema = z.object({
  received: z.enum(VACCINATION_STATUS_OPTIONS).optional().or(z.literal("")),
  date:     z.string().optional().or(z.literal("")),
});
export type VaccinationEntry = z.infer<typeof vaccinationEntrySchema>;

export const vaccinationHistorySchema = z.object({
  tetanus_dtap:            vaccinationEntrySchema,
  tetanus_booster:         vaccinationEntrySchema,
  mmr:                     vaccinationEntrySchema,
  covid_19:                vaccinationEntrySchema,
  pneumonia:               vaccinationEntrySchema,
  haemophilus_influenzae:  vaccinationEntrySchema,
  varicella:               vaccinationEntrySchema,
  hepatitis_b:             vaccinationEntrySchema,
  hepatitis_a:             vaccinationEntrySchema,
  meningococcal:           vaccinationEntrySchema,
  tb_test:                 vaccinationEntrySchema,
});
export type VaccinationHistory = z.infer<typeof vaccinationHistorySchema>;

const EMPTY_VACCINATION_ENTRY: VaccinationEntry = { received: undefined, date: "" };

export const DEFAULT_VACCINATION_HISTORY: VaccinationHistory = {
  tetanus_dtap:           EMPTY_VACCINATION_ENTRY,
  tetanus_booster:        EMPTY_VACCINATION_ENTRY,
  mmr:                    EMPTY_VACCINATION_ENTRY,
  covid_19:               EMPTY_VACCINATION_ENTRY,
  pneumonia:              EMPTY_VACCINATION_ENTRY,
  haemophilus_influenzae: EMPTY_VACCINATION_ENTRY,
  varicella:              EMPTY_VACCINATION_ENTRY,
  hepatitis_b:            EMPTY_VACCINATION_ENTRY,
  hepatitis_a:            EMPTY_VACCINATION_ENTRY,
  meningococcal:          EMPTY_VACCINATION_ENTRY,
  tb_test:                EMPTY_VACCINATION_ENTRY,
};


// ── Developmental history — 6-field object ───────────────────────────────────

export const developmentalHistorySchema = z.object({
  pregnancy_complications: z.string().trim().max(2000).optional().or(z.literal("")),
  birth_complications:     z.string().trim().max(2000).optional().or(z.literal("")),
  temperament:             z.string().trim().max(2000).optional().or(z.literal("")),
  milestone_delays:        z.string().trim().max(2000).optional().or(z.literal("")),
  childhood_events:        z.string().trim().max(2000).optional().or(z.literal("")),
  social_emotional_delays: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type DevelopmentalHistory = z.infer<typeof developmentalHistorySchema>;

export const DEFAULT_DEVELOPMENTAL_HISTORY: DevelopmentalHistory = {
  pregnancy_complications: "",
  birth_complications: "",
  temperament: "",
  milestone_delays: "",
  childhood_events: "",
  social_emotional_delays: "",
};


// ── Past Medical History — 9-category object of booleans + specify_if_needed ──

export const pastMedicalHistorySchema = z.object({

  eyes_ears: z.object({
    vision_problems:  z.boolean().default(false),
    hearing_problems: z.boolean().default(false),
    other_ear_problems: z.boolean().default(false),
    vertigo:          z.boolean().default(false),
    specify_if_needed: z.string().trim().max(500).optional().or(z.literal("")),
  }),

  neurological: z.object({
    hemiplegia:              z.boolean().default(false),
    seizure_disorder_no_meds: z.boolean().default(false),
    epilepsy_on_meds:        z.boolean().default(false),
    loss_of_consciousness:   z.boolean().default(false),
    depression:              z.boolean().default(false),
    cerebral_palsy:          z.boolean().default(false),
    other:                   z.boolean().default(false),
    specify_if_needed:       z.string().trim().max(500).optional().or(z.literal("")),
  }),

  heart: z.object({
    heart_disease:     z.boolean().default(false),
    irregular_rhythm:  z.boolean().default(false),
    atrial_fibrillation: z.boolean().default(false),
    high_blood_pressure: z.boolean().default(false),
    other:             z.boolean().default(false),
    specify_if_needed: z.string().trim().max(500).optional().or(z.literal("")),
  }),

  lungs: z.object({
    copd:              z.boolean().default(false),
    emphysema:         z.boolean().default(false),
    asthma:            z.boolean().default(false),
    chronic_bronchitis: z.boolean().default(false),
    other:             z.boolean().default(false),
    specify_if_needed: z.string().trim().max(500).optional().or(z.literal("")),
  }),

  endocrine: z.object({
    diabetes:          z.boolean().default(false),
    diabetes_type_2:   z.boolean().default(false),
    diabetes_type_1:   z.boolean().default(false),
    pre_diabetes:      z.boolean().default(false),
    hemophilia:        z.boolean().default(false),
    other_blood_disorder: z.boolean().default(false),
    other:             z.boolean().default(false),
    specify_if_needed: z.string().trim().max(500).optional().or(z.literal("")),
  }),

  liver_pancreas_kidney: z.object({
    liver_disease:        z.boolean().default(false),
    hepatitis:            z.boolean().default(false),
    chronic_pancreatitis: z.boolean().default(false),
    celiac:               z.boolean().default(false),
    other:                z.boolean().default(false),
    specify_if_needed:    z.string().trim().max(500).optional().or(z.literal("")),
  }),

  gastrointestinal: z.object({
    ibd:                 z.boolean().default(false),
    crohns:              z.boolean().default(false),
    peptic_ulcer:        z.boolean().default(false),
    abnormal_weight_loss: z.boolean().default(false),
    other:               z.boolean().default(false),
    specify_if_needed:   z.string().trim().max(500).optional().or(z.literal("")),
  }),

  bone: z.object({
    vertebral_fractures:   z.boolean().default(false),
    hip_fractures:         z.boolean().default(false),
    other_fractures:       z.boolean().default(false),
    structural_chronic_pain: z.boolean().default(false),
    other_issues:          z.boolean().default(false),
    specify_if_needed:     z.string().trim().max(500).optional().or(z.literal("")),
  }),

  skin_circulatory: z.object({
    skin_sore_ulcer:    z.boolean().default(false),
    non_healing_wounds: z.boolean().default(false),
    other:              z.boolean().default(false),
    specify_if_needed:  z.string().trim().max(500).optional().or(z.literal("")),
  }),
});
export type PastMedicalHistory = z.infer<typeof pastMedicalHistorySchema>;

export const DEFAULT_PAST_MEDICAL_HISTORY: PastMedicalHistory = {
  eyes_ears:            { vision_problems: false, hearing_problems: false, other_ear_problems: false, vertigo: false, specify_if_needed: "" },
  neurological:         { hemiplegia: false, seizure_disorder_no_meds: false, epilepsy_on_meds: false, loss_of_consciousness: false, depression: false, cerebral_palsy: false, other: false, specify_if_needed: "" },
  heart:                { heart_disease: false, irregular_rhythm: false, atrial_fibrillation: false, high_blood_pressure: false, other: false, specify_if_needed: "" },
  lungs:                { copd: false, emphysema: false, asthma: false, chronic_bronchitis: false, other: false, specify_if_needed: "" },
  endocrine:            { diabetes: false, diabetes_type_2: false, diabetes_type_1: false, pre_diabetes: false, hemophilia: false, other_blood_disorder: false, other: false, specify_if_needed: "" },
  liver_pancreas_kidney: { liver_disease: false, hepatitis: false, chronic_pancreatitis: false, celiac: false, other: false, specify_if_needed: "" },
  gastrointestinal:     { ibd: false, crohns: false, peptic_ulcer: false, abnormal_weight_loss: false, other: false, specify_if_needed: "" },
  bone:                 { vertebral_fractures: false, hip_fractures: false, other_fractures: false, structural_chronic_pain: false, other_issues: false, specify_if_needed: "" },
  skin_circulatory:     { skin_sore_ulcer: false, non_healing_wounds: false, other: false, specify_if_needed: "" },
};


// ── Medical Profile ───────────────────────────────────────────────────────────

/**
 * Medical Profile — nested object under the client document.
 * All fields are optional at the base level.
 * Mirrors the physical "Participant Health History" form exactly.
 */
export const medicalProfileSchema = z.object({
  // ── Seasickness ───────────────────────────────────────────────────────
  seasickness_meds: seasicknessMedsSchema.optional().default(DEFAULT_SEASICKNESS_MEDS as SeasicknessMeds),

  // ── Dynamic Arrays ───────────────────────────────────────────────────
  allergies:               z.array(allergySchema).default([]),
  medications:             z.array(medicationSchema).default([]),
  hospitalization_history: z.array(hospitalizationSchema).default([]),
  healthcare_providers:    z.array(healthcareProviderSchema).default([]),

  // ── Hardcoded Vaccination Object ─────────────────────────────────────
  vaccination_history: vaccinationHistorySchema.optional().default(DEFAULT_VACCINATION_HISTORY as VaccinationHistory),

  // ── Developmental History Object ─────────────────────────────────────
  developmental_history: developmentalHistorySchema.optional().default(DEFAULT_DEVELOPMENTAL_HISTORY as DevelopmentalHistory),

  // ── Past Medical History (9 categories) ─────────────────────────────
  past_medical_history: pastMedicalHistorySchema.optional().default(DEFAULT_PAST_MEDICAL_HISTORY as PastMedicalHistory),

  // ── Preserved Free-text Fields ───────────────────────────────────────
  dietary_restrictions:    z.string().trim().max(500).optional().or(z.literal("")),
  psychiatric_history:     z.string().trim().max(2000).optional().or(z.literal("")),
  treatment_history_details:  z.string().trim().max(2000).optional().or(z.literal("")),
  physical_accommodations:    z.string().trim().max(1000).optional().or(z.literal("")),
  general_accommodations:     z.string().trim().max(1000).optional().or(z.literal("")),
});

export type MedicalProfile = z.infer<typeof medicalProfileSchema>;


/**
 * Step 2 — Medical Profile (alias for backward compatibility with tab imports).
 */
export const medicalProfileStepSchema = medicalProfileSchema;
export type MedicalProfileFormData = z.infer<typeof medicalProfileStepSchema>;