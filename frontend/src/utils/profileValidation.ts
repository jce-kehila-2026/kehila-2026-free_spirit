export function hasMeaningfulData(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulData(item));
  }
  if (typeof value === "object") {
    if (value instanceof Date) return !isNaN(value.getTime());
    return Object.values(value as Record<string, unknown>).some((val) => hasMeaningfulData(val));
  }
  return true;
}

export const PROFILE_FORM_FIELDS: Record<string, string[]> = {
  profileAndDemographics: [
    "first_name", "last_name", "email", "phone", "passport_id", "gender", "address", 
    "dob", "referrer", "education_status", "program_ids", "diagnosis", "personal_notes", 
    "passport_country", "citizenship", "date_of_entry", "purpose_of_visit", 
    "home_address", "household_members"
  ],
  contacts: [
    "contacts.contact_name", "contacts.relationship", "contacts.phone", 
    "contacts.email", "contacts.is_emergency_contact"
  ],
  questionnaire: [
    "questionnaire.talents_and_skills", "questionnaire.community_contribution", 
    "questionnaire.ideal_roommate", "questionnaire.favorite_foods", 
    "questionnaire.desired_activities", "questionnaire.program_worries", 
    "questionnaire.main_goals", "questionnaire.personal_challenge", 
    "questionnaire.staff_assistance", "questionnaire.main_strengths", 
    "questionnaire.passions", "questionnaire.dream_jobs"
  ],
  legalConsents: [
    "legal_consents.release_authorizing_person", "legal_consents.authorized_agencies", 
    "legal_consents.info_to_disclose", "legal_consents.release_reason", 
    "legal_consents.release_expiration_date", "legal_consents.release_expiration_event", 
    "legal_consents.visit_waiver_child_name", "legal_consents.visit_waiver_signatures"
  ],
  medical: [
    "medical_profile.seasickness_meds.not_able_to_take",
    "medical_profile.seasickness_meds.bringing_own_for_personal_use",
    "medical_profile.seasickness_meds.can_take_if_necessary",
    "medical_profile.seasickness_meds.can_take_any_if_needed",
    "medical_profile.seasickness_meds.specify_if_needed",
    "medical_profile.allergies.allergen",
    "medical_profile.allergies.reaction_severity",
    "medical_profile.medications.name",
    "medical_profile.medications.frequency",
    "medical_profile.medications.dose",
    "medical_profile.medications.route",
    "medical_profile.medications.condition",
    "medical_profile.hospitalization_history.type",
    "medical_profile.hospitalization_history.date",
    "medical_profile.hospitalization_history.description",
    "medical_profile.healthcare_providers.name",
    "medical_profile.healthcare_providers.specialty",
    "medical_profile.healthcare_providers.phone",
    "medical_profile.healthcare_providers.email",
    "medical_profile.healthcare_providers.facility",
    "medical_profile.healthcare_providers.last_appt",
    "medical_profile.vaccination_history.tetanus_dtap.received",
    "medical_profile.vaccination_history.tetanus_dtap.date",
    "medical_profile.vaccination_history.tetanus_booster.received",
    "medical_profile.vaccination_history.tetanus_booster.date",
    "medical_profile.vaccination_history.mmr.received",
    "medical_profile.vaccination_history.mmr.date",
    "medical_profile.vaccination_history.covid_19.received",
    "medical_profile.vaccination_history.covid_19.date",
    "medical_profile.vaccination_history.pneumonia.received",
    "medical_profile.vaccination_history.pneumonia.date",
    "medical_profile.vaccination_history.haemophilus_influenzae.received",
    "medical_profile.vaccination_history.haemophilus_influenzae.date",
    "medical_profile.vaccination_history.varicella.received",
    "medical_profile.vaccination_history.varicella.date",
    "medical_profile.vaccination_history.hepatitis_b.received",
    "medical_profile.vaccination_history.hepatitis_b.date",
    "medical_profile.vaccination_history.hepatitis_a.received",
    "medical_profile.vaccination_history.hepatitis_a.date",
    "medical_profile.vaccination_history.meningococcal.received",
    "medical_profile.vaccination_history.meningococcal.date",
    "medical_profile.vaccination_history.tb_test.received",
    "medical_profile.vaccination_history.tb_test.date",
    "medical_profile.developmental_history.pregnancy_complications",
    "medical_profile.developmental_history.birth_complications",
    "medical_profile.developmental_history.temperament",
    "medical_profile.developmental_history.milestone_delays",
    "medical_profile.developmental_history.childhood_events",
    "medical_profile.developmental_history.social_emotional_delays",
    "medical_profile.past_medical_history.eyes_ears.vision_problems",
    "medical_profile.past_medical_history.eyes_ears.hearing_problems",
    "medical_profile.past_medical_history.eyes_ears.other_ear_problems",
    "medical_profile.past_medical_history.eyes_ears.vertigo",
    "medical_profile.past_medical_history.eyes_ears.specify_if_needed",
    "medical_profile.past_medical_history.neurological.hemiplegia",
    "medical_profile.past_medical_history.neurological.seizure_disorder_no_meds",
    "medical_profile.past_medical_history.neurological.epilepsy_on_meds",
    "medical_profile.past_medical_history.neurological.loss_of_consciousness",
    "medical_profile.past_medical_history.neurological.depression",
    "medical_profile.past_medical_history.neurological.cerebral_palsy",
    "medical_profile.past_medical_history.neurological.other",
    "medical_profile.past_medical_history.neurological.specify_if_needed",
    "medical_profile.past_medical_history.heart.heart_disease",
    "medical_profile.past_medical_history.heart.irregular_rhythm",
    "medical_profile.past_medical_history.heart.atrial_fibrillation",
    "medical_profile.past_medical_history.heart.high_blood_pressure",
    "medical_profile.past_medical_history.heart.other",
    "medical_profile.past_medical_history.heart.specify_if_needed",
    "medical_profile.past_medical_history.lungs.copd",
    "medical_profile.past_medical_history.lungs.emphysema",
    "medical_profile.past_medical_history.lungs.asthma",
    "medical_profile.past_medical_history.lungs.chronic_bronchitis",
    "medical_profile.past_medical_history.lungs.other",
    "medical_profile.past_medical_history.lungs.specify_if_needed",
    "medical_profile.past_medical_history.endocrine.diabetes",
    "medical_profile.past_medical_history.endocrine.diabetes_type_2",
    "medical_profile.past_medical_history.endocrine.diabetes_type_1",
    "medical_profile.past_medical_history.endocrine.pre_diabetes",
    "medical_profile.past_medical_history.endocrine.hemophilia",
    "medical_profile.past_medical_history.endocrine.other_blood_disorder",
    "medical_profile.past_medical_history.endocrine.other",
    "medical_profile.past_medical_history.endocrine.specify_if_needed",
    "medical_profile.past_medical_history.liver_pancreas_kidney.liver_disease",
    "medical_profile.past_medical_history.liver_pancreas_kidney.hepatitis",
    "medical_profile.past_medical_history.liver_pancreas_kidney.chronic_pancreatitis",
    "medical_profile.past_medical_history.liver_pancreas_kidney.celiac",
    "medical_profile.past_medical_history.liver_pancreas_kidney.other",
    "medical_profile.past_medical_history.liver_pancreas_kidney.specify_if_needed",
    "medical_profile.past_medical_history.gastrointestinal.ibd",
    "medical_profile.past_medical_history.gastrointestinal.crohns",
    "medical_profile.past_medical_history.gastrointestinal.peptic_ulcer",
    "medical_profile.past_medical_history.gastrointestinal.abnormal_weight_loss",
    "medical_profile.past_medical_history.gastrointestinal.other",
    "medical_profile.past_medical_history.gastrointestinal.specify_if_needed",
    "medical_profile.past_medical_history.bone.vertebral_fractures",
    "medical_profile.past_medical_history.bone.hip_fractures",
    "medical_profile.past_medical_history.bone.other_fractures",
    "medical_profile.past_medical_history.bone.structural_chronic_pain",
    "medical_profile.past_medical_history.bone.other_issues",
    "medical_profile.past_medical_history.bone.specify_if_needed",
    "medical_profile.past_medical_history.skin_circulatory.skin_sore_ulcer",
    "medical_profile.past_medical_history.skin_circulatory.non_healing_wounds",
    "medical_profile.past_medical_history.skin_circulatory.other",
    "medical_profile.past_medical_history.skin_circulatory.specify_if_needed",
    "medical_profile.dietary_restrictions",
    "medical_profile.psychiatric_history",
    "medical_profile.treatment_history_details",
    "medical_profile.physical_accommodations",
    "medical_profile.general_accommodations"
  ]
};

// Helper function to extract deeply nested values using dot notation
function resolveNestedField(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!obj) return undefined;
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    if (Array.isArray(current)) {
      current = current.map(item => (item as Record<string, unknown>)?.[part]);
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  
  return current;
}

export function calculateTabProgress(clientData: Record<string, unknown> | null | undefined, tabName: string): number {
  if (!clientData || !PROFILE_FORM_FIELDS[tabName]) return 0;
  
  const fields = PROFILE_FORM_FIELDS[tabName];
  if (fields.length === 0) return 100;
  
  let filledCount = 0;
  let totalFields = 0;
  fields.forEach((fieldPath) => {
    const value = resolveNestedField(clientData, fieldPath);
    if (typeof value === "boolean") return;
    
    totalFields++;
    if (hasMeaningfulData(value)) {
      filledCount++;
    }
  });
  
  return totalFields === 0 ? 100 : Math.round((filledCount / totalFields) * 100);
}

export function calculateOverallProgress(clientData: Record<string, unknown> | null | undefined): number {
  if (!clientData) return 0;
  
  const allFields = Object.values(PROFILE_FORM_FIELDS).flat();
  if (allFields.length === 0) return 100;
  
  let filledCount = 0;
  let totalFields = 0;
  allFields.forEach((fieldPath) => {
    const value = resolveNestedField(clientData, fieldPath);
    if (typeof value === "boolean") return;
    
    totalFields++;
    if (hasMeaningfulData(value)) {
      filledCount++;
    }
  });
  
  return totalFields === 0 ? 100 : Math.round((filledCount / totalFields) * 100);
}
