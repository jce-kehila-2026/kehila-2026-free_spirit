import { z } from "zod";
import { CONTACT_RELATIONSHIP } from "./constants"
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


/**
 * Step 3 — Contacts.
 */
export const contactsStepSchema = z.object({
  contacts: z.array(contactSchema).default([]),
});

export type ContactsFormData = z.infer<typeof contactsStepSchema>;
