import { z } from "zod";

export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
] as const;

export const CUSTOM_FIELD_TABS = [
  "profile",
  "medical",
  "contacts",
  "questionnaire",
  "legal_consents",
  "documents",
] as const;

export const customFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const customFieldsSchema = z.record(customFieldValueSchema).default({});

export const clientFieldDefinitionSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1).max(80),
  type: z.enum(CUSTOM_FIELD_TYPES),
  tab: z.enum(CUSTOM_FIELD_TABS).default("profile"),
  options: z.array(z.string().trim().min(1).max(80)).default([]),
  isCustom: z.literal(true),
  active: z.boolean(),
  hiddenFromManager: z.boolean().optional().default(false),
  createdBy: z.string(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  deletedAt: z.unknown().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  order: z.number(),
});

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type CustomFieldTab = (typeof CUSTOM_FIELD_TABS)[number];
export type CustomFieldValue = z.infer<typeof customFieldValueSchema>;
export type CustomFields = z.infer<typeof customFieldsSchema>;
export type ClientFieldDefinition = z.infer<typeof clientFieldDefinitionSchema>;
