import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import {
  medicalProfileSchema,
  type MedicalProfile,
  type HealthcareProvider,
  type Allergy,
  type Medication,
  type Hospitalization,
  DEFAULT_VACCINATION_HISTORY,
  DEFAULT_DEVELOPMENTAL_HISTORY,
  DEFAULT_PAST_MEDICAL_HISTORY,
  DEFAULT_SEASICKNESS_MEDS,
} from "@/schema/medicalSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

// ─── Empty record templates ───────────────────────────────────────────────────

export const EMPTY_PROVIDER: HealthcareProvider = {
  name: "", specialty: "", phone: "", email: "", facility: "", last_appt: "",
};

export const EMPTY_ALLERGY: Allergy = {
  allergen: "", reaction_severity: "",
};

export const EMPTY_MEDICATION: Medication = {
  name: "", frequency: "", dose: "", route: "", condition: "",
};

export const EMPTY_HOSPITALIZATION: Hospitalization = {
  type: undefined, date: "", description: "",
};

// ─── Legacy migration helpers ────────────────────────────────────────────────
// Old records stored `allergies` and `medications` as plain strings.
// Safely coerce either shape into the expected array-of-objects.

function coerceAllergies(raw: unknown): Allergy[] {
  if (Array.isArray(raw)) {
    return raw.map((a) => ({
      allergen: (a as Allergy).allergen ?? "",
      reaction_severity: (a as Allergy).reaction_severity ?? "",
    }));
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return [{ allergen: raw.trim(), reaction_severity: "" }];
  }
  return [];
}

function coerceMedications(raw: unknown): Medication[] {
  if (Array.isArray(raw)) {
    return raw.map((m) => ({
      name:      (m as Medication).name      ?? "",
      frequency: (m as Medication).frequency ?? "",
      dose:      (m as Medication).dose      ?? "",
      route:     (m as Medication).route     ?? "",
      condition: (m as Medication).condition ?? "",
    }));
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return [{ name: raw.trim(), frequency: "", dose: "", route: "", condition: "" }];
  }
  return [];
}

/**
 * Tier 2: Application Controller for the Medical Tab.
 * Manages field arrays, accordion state, and DB saves.
 */
export function useMedicalTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);

  const mp = client.medical_profile ?? {};

  // 1. Accordion State
  const [open, setOpen] = useState({
    providers: false,
    screening: false,
    allergies: false,
    medications: false,
    hospitalizations: false,
    vaccinations: false,
    developmental: false,
    pastHistory: false,
    history: false,
  });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 2. Initialize Form Engine
  const form = useForm<MedicalProfile>({
    resolver: zodResolver(medicalProfileSchema),
    mode: "onTouched",
    defaultValues: {
      // Seasickness Medications object
      seasickness_meds: {
        ...DEFAULT_SEASICKNESS_MEDS,
        ...(mp as MedicalProfile).seasickness_meds,
      },

      // Dynamic arrays — coerced from either legacy string or new array shape
      allergies:   coerceAllergies((mp as MedicalProfile).allergies),
      medications: coerceMedications((mp as MedicalProfile).medications),
      hospitalization_history: (mp.hospitalization_history ?? []).map((h) => ({
        type: h.type ?? undefined,
        date: h.date ?? "",
        description: h.description ?? "",
      })),
      healthcare_providers: (mp.healthcare_providers ?? []).map((p) => ({
        name: p.name ?? "", specialty: p.specialty ?? "", phone: p.phone ?? "",
        email: p.email ?? "", facility: p.facility ?? "", last_appt: p.last_appt ?? "",
      })),

      // Hardcoded vaccination object
      vaccination_history: {
        ...DEFAULT_VACCINATION_HISTORY,
        ...(mp as MedicalProfile).vaccination_history,
      },

      // Developmental history object
      developmental_history: {
        ...DEFAULT_DEVELOPMENTAL_HISTORY,
        ...(mp as MedicalProfile).developmental_history,
      },

      // Past medical history
      past_medical_history: {
        ...DEFAULT_PAST_MEDICAL_HISTORY,
        ...(mp as MedicalProfile).past_medical_history,
      },

      // Preserved free-text fields
      dietary_restrictions:      mp.dietary_restrictions      ?? "",
      psychiatric_history:       mp.psychiatric_history       ?? "",
      treatment_history_details: (mp as MedicalProfile).treatment_history_details ?? "",
      physical_accommodations:   (mp as MedicalProfile).physical_accommodations   ?? "",
      general_accommodations:    (mp as MedicalProfile).general_accommodations    ?? "",
    },
  });

  // 3. Field Arrays
  const providersArray = useFieldArray({ control: form.control, name: "healthcare_providers" });
  const allergiesArray = useFieldArray({ control: form.control, name: "allergies" });
  const medicationsArray = useFieldArray({ control: form.control, name: "medications" });
  const hospitalizationsArray = useFieldArray({ control: form.control, name: "hospitalization_history" });

  // 4. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: MedicalProfile) {
    setIsSaving(true);
    try {
      await updateClientDoc(client.id, { medical_profile: data });
      form.reset(data); // Resets isDirty
      toast.success("Medical profile saved successfully.");
    } catch (err) {
      console.error("[MedicalTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    form,
    accordions: { open, toggle: toggleSection },
    arrays: {
      providers: providersArray,
      allergies: allergiesArray,
      medications: medicationsArray,
      hospitalizations: hospitalizationsArray,
    },
    submission: { isSaving, onSubmit },
  };
}