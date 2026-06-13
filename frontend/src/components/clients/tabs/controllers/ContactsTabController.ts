import { useState } from "react";
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
  relationship: "other",
  phone: "",
  email: "",
  is_emergency_contact: false,
};

/**
 * Tier 2: Application Controller for the Contacts Tab.
 * Manages form state, array validation, and database submissions.
 */
export function useContactsTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialize Form Engine
  const form = useForm<ContactsFormData>({
    resolver: zodResolver(contactsStepSchema),
    mode: "onTouched",
    defaultValues: {
      contacts: (client.contacts ?? []).map((c) => ({
        contact_name: c.contact_name ?? "",
        relationship: c.relationship ?? "other",
        phone: c.phone ?? "",
        email: c.email ?? "",
        is_emergency_contact: c.is_emergency_contact ?? false,
      })),
    },
  });

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