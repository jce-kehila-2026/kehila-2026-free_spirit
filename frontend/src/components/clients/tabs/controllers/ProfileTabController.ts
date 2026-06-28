import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import { basicInfoSchema, type BasicInfoFormData } from "@/schema/clientSchema";
import { type Dependent } from "@/schema/supplementarySchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

export const EMPTY_DEPENDENT: Dependent = {
  name: "",
  relationship: "",
  dob: "",
};

/**
 * Tier 2: Application Controller for the Profile Tab.
 * Manages all form state, validation side-effects, and database submissions.
 */
export function useProfileTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState({ basic: false, demographics: false, dependents: false });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 1. Initialize Form Engine
  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: "onTouched",
    defaultValues: {
      first_name: client.first_name ?? "",
      last_name: client.last_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      status: client.status ?? "draft",
      passport_id: client.passport_id ?? "",
      gender: client.gender ?? undefined,
      address: client.address ?? "",
      dob: client.dob ?? "",
      referrer: client.referrer ?? "",
      education_status: client.education_status ?? undefined,
      program_ids: client.program_ids ?? [],
      diagnosis: client.diagnosis ?? "",
      personal_notes: client.personal_notes ?? "",
      passport_country: client.passport_country ?? "",
      citizenship: client.citizenship ?? "",
      home_address: client.home_address ?? "",
      household_members: client.household_members ?? "",
      dependents: (client.dependents ?? []).map((d) => ({
        name: d.name ?? "",
        relationship: d.relationship ?? "",
        dob: d.dob ?? "",
      })),
      custom_fields: client.custom_fields ?? {},
    },
  });

  // 2. Initialize Field Arrays
  const {
    fields: dependentFields,
    append: appendDependent,
    remove: removeDependent,
  } = useFieldArray({
    control: form.control,
    name: "dependents",
  });

  const { errors } = form.formState;

  // 3. Error Listeners (Auto-open accordions if a field fails validation)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.first_name || errors.last_name || errors.email || errors.phone || errors.status) {
        setOpen((prev) => ({ ...prev, basic: true }));
      }
      if (
        errors.passport_id || errors.passport_country ||
        errors.citizenship || errors.dob || errors.gender || errors.education_status ||
        errors.referrer || errors.address || errors.home_address || errors.household_members ||
        errors.diagnosis || errors.personal_notes
      ) {
        setOpen((prev) => ({ ...prev, demographics: true }));
      }
      if (errors.dependents) {
        setOpen((prev) => ({ ...prev, dependents: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    errors.first_name, errors.last_name, errors.email, errors.phone, errors.status,
    errors.passport_id, errors.passport_country,
    errors.citizenship, errors.dob, errors.gender, errors.education_status,
    errors.referrer, errors.address, errors.home_address, errors.household_members,
    errors.diagnosis, errors.personal_notes, errors.dependents,
  ]);

  // 4. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: BasicInfoFormData) {
    setIsSaving(true);
    try {
      const mergedData = {
        ...data,
        custom_fields: {
          ...(client.custom_fields ?? {}),
          ...(data.custom_fields ?? {}),
        },
      };
      await updateClientDoc(client.id, mergedData);
      form.reset(mergedData); // Resets isDirty state so the save button disables again
      toast.success("Profile saved successfully.");
    } catch (err) {
      console.error("[ProfileTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // 5. Expose strictly what the UI Layer needs
  return {
    form,
    dependents: {
      fields: dependentFields,
      append: appendDependent,
      remove: removeDependent,
    },
    accordions: {
      open,
      toggle: toggleSection,
    },
    submission: {
      isSaving,
      onSubmit,
    },
  };
}
