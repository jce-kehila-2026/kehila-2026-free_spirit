// ============================================================================
// Enums & Constants
// ============================================================================

export const nameRegex = /^[\p{L}\s'-]+$/u;
export const nameError = "Name can only contain letters, spaces, hyphens, and apostrophes";

export const CLIENT_STATUS = ["interested", "invited", "registered", "draft"] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, { en: string; he: string }> = {
  interested: { en: "Interested", he: "מתעניין" },
  invited: { en: "Invited", he: "נשלחה הזמנה" },
  registered: { en: "Registered", he: "רשום" },
  draft: { en: "Draft", he: "טיוטה" },
};

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
  "host_family",
  "social_worker",
  "other",
] as const;
export type ContactRelationship = (typeof CONTACT_RELATIONSHIP)[number];
