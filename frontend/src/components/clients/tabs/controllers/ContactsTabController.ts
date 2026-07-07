import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import { contactsStepSchema, type Contact, type ContactsFormData } from "@/schema/contactSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

export const EMPTY_CONTACT: Contact = {
  contact_name: "",
  // Empty string so superRefine correctly flags a blank card as invalid.
  // Pre-filling "other" was masking the relationship-required check.
  relationship: "",
  phone: "",
  email: "",
  is_emergency_contact: false,
};

function getContactsDefaultValues(client: ClientDoc): ContactsFormData {
  return {
    contacts: (client.contacts ?? []).map((c) => ({
      contact_name: c.contact_name ?? "",
      relationship: c.relationship ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      is_emergency_contact: c.is_emergency_contact ?? false,
    })),
  };
}

/**
 * Tier 2: Application Controller for the Contacts Tab.
 * Manages form state, array validation, and database submissions.
 */
export function useContactsTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialize Form Engine
  const form = useForm<ContactsFormData>({
    resolver: zodResolver(contactsStepSchema),
    // "all" = validate on change AND on blur AND re-validate on submit.
    // This ensures fields the user never touched are still caught when
    // the Save button is pressed on a card that was added but left blank.
    mode: "all",
    defaultValues: getContactsDefaultValues(client),
  });

  // 1.5 Sync External Updates (from other tabs)
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(getContactsDefaultValues(client));
    }
  }, [client, form, form.formState.isDirty]);

  // 2. Initialize Main Contacts Array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const { errors } = form.formState;

  // Top-level array error (e.g. "at least one contact required")
  const arrayError =
    (errors.contacts as { message?: string } | undefined)?.message ??
    (errors.contacts as { root?: { message?: string } } | undefined)?.root?.message;

  // 3. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: ContactsFormData) {
    // Explicit full-form validation pass as a safety net.
    // handleSubmit() already runs the resolver, but trigger() forces
    // RHF to surface errors on every field — including untouched ones —
    // which matters when a card is appended and saved without interaction.
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    try {
      // updateClientDoc automatically sanitizes undefined values under the hood
      await updateClientDoc(client.id, {
        contacts: data.contacts,
      });

      form.reset(data); // Resets isDirty state
      toast.success("Contacts saved successfully.");
    } catch (err) {
      console.error("[ContactsTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // 4. Expose strictly what the UI Layer needs
  return {
    form,
    contacts: {
      fields,
      append,
      remove,
    },
    arrayError,
    submission: {
      isSaving,
      onSubmit,
    },
  };
}