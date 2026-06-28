import { z } from "zod";
import { CONTACT_RELATIONSHIP } from "./constants"

/**
 * Contact — one entry in the contacts[] array.
 *
 * All fields are optional at the base schema level.
 * The clientSchema superRefine enforces that if a contact card is present,
 * contact_name, phone, AND relationship must be filled in.
 */
export const contactSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .max(100, "Contact name is too long")
    .regex(/^[\p{L}\s'\-.]+$/u, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .optional()
    .or(z.literal("")),

  relationship: z.enum(CONTACT_RELATIONSHIP, {
    errorMap: () => ({ message: "Please select a relationship" }),
  }).optional().or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, {
      message: "Enter a valid phone number (e.g., +1 555-0198 or 050-1234567)",
    })
    .optional()
    .or(z.literal("")),

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
 * Contacts step schema — wraps the array for profile-tab use.
 *
 * superRefine mirrors the logic in clientSchema so the standalone Contacts
 * tab resolver (which never sees clientSchema) also enforces the three
 * required-when-present fields: contact_name, phone, and relationship.
 */
export const contactsStepSchema = z
  .object({
    contacts: z.array(contactSchema).default([]),
  })
  .superRefine((data, ctx) => {
    data.contacts.forEach((contact, index) => {
      const name = typeof contact.contact_name === "string" ? contact.contact_name.trim() : "";
      const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
      const relationship = typeof contact.relationship === "string" ? contact.relationship.trim() : "";

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
      if (!relationship) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Relationship is required",
          path: ["contacts", index, "relationship"],
        });
      }
    });
  });

export type ContactsFormData = z.infer<typeof contactsStepSchema>;
