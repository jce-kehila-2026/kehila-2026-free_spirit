import { z } from "zod";

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
