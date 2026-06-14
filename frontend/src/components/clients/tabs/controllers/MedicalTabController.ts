import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import { 
  medicalProfileSchema, 
  type MedicalProfile, 
  type HealthcareProvider, 
  type Vaccination, 
  type Hospitalization 
} from "@/schema/medicalSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

// ─── Empty record templates ───────────────────────────────────────────────────
export const EMPTY_PROVIDER: HealthcareProvider = {
  name: "", specialty: "", phone: "", email: "", facility: "", last_appt: "",
};

export const EMPTY_VACCINATION: Vaccination = {
  type: "", received: false, date: "",
};

export const EMPTY_HOSPITALIZATION: Hospitalization = {
  type: "", date: "", description: "",
};

/**
 * Tier 2: Application Controller for the Medical Tab.
 * Manages 3 field arrays, custom condition lists, 8 accordions, and DB saves.
 */
export function useMedicalTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);
  const [conditionInput, setConditionInput] = useState("");

  const mp = client.medical_profile ?? {};

  // 1. Accordion State
  const [open, setOpen] = useState({
    insurance: false, vitals: false, providers: false, screening: false,
    conditions: false, history: false, vaccinations: false, hospitalizations: false,
  });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 2. Initialize Form Engine
  const form = useForm<MedicalProfile>({
    resolver: zodResolver(medicalProfileSchema),
    mode: "onTouched",
    defaultValues: {
      insurance_company:        mp.insurance_company        ?? "",
      policy_number:            mp.policy_number            ?? "",
      medical_clearance_status: mp.medical_clearance_status ?? undefined,
      physical_height:          mp.physical_height          ?? "",
      physical_weight:          mp.physical_weight          ?? "",
      physical_blood_pressure:  mp.physical_blood_pressure  ?? "",
      physical_pulse_rate:      mp.physical_pulse_rate      ?? "",
      pulse_irregularities:     mp.pulse_irregularities     ?? false,
      uses_narcotics_alcohol:       mp.uses_narcotics_alcohol       ?? false,
      pending_medical_exams:        mp.pending_medical_exams        ?? false,
      trip_for_medical_care:        mp.trip_for_medical_care        ?? false,
      pending_surgery:              mp.pending_surgery              ?? false,
      recent_hospitalizations:      mp.recent_hospitalizations      ?? false,
      medical_air_transport_rider:  mp.medical_air_transport_rider  ?? false,
      alcohol_glasses_per_day:      mp.alcohol_glasses_per_day      ?? "",
      seasickness_meds_pref:        mp.seasickness_meds_pref        ?? "",
      allergies:                  mp.allergies                  ?? "",
      medications:                mp.medications                ?? "",
      dietary_restrictions:       mp.dietary_restrictions       ?? "",
      psychiatric_history:        mp.psychiatric_history        ?? "",
      developmental_history:      mp.developmental_history      ?? "",
      treatment_history_details:  mp.treatment_history_details  ?? "",
      physical_accommodations:    mp.physical_accommodations    ?? "",
      general_accommodations:     mp.general_accommodations     ?? "",
      medical_conditions_checklist: mp.medical_conditions_checklist ?? [],
      healthcare_providers: (mp.healthcare_providers ?? []).map((p) => ({
        name: p.name ?? "", specialty: p.specialty ?? "", phone: p.phone ?? "",
        email: p.email ?? "", facility: p.facility ?? "", last_appt: p.last_appt ?? "",
      })),
      vaccination_history: (mp.vaccination_history ?? []).map((v) => ({
        type: v.type ?? "", received: v.received ?? false, date: v.date ?? "",
      })),
      hospitalization_history: (mp.hospitalization_history ?? []).map((h) => ({
        type: h.type ?? "", date: h.date ?? "", description: h.description ?? "",
      })),
    },
  });

  const { errors } = form.formState;

  // 3. Field Arrays
  const providersArray = useFieldArray({ control: form.control, name: "healthcare_providers" });
  const vaccinationsArray = useFieldArray({ control: form.control, name: "vaccination_history" });
  const hospitalizationsArray = useFieldArray({ control: form.control, name: "hospitalization_history" });

  // 4. Conditions Checklist State
  const [conditions, setConditions] = useState<string[]>(mp.medical_conditions_checklist ?? []);

  function addCondition() {
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    const next = [...conditions, trimmed];
    setConditions(next);
    form.setValue("medical_conditions_checklist", next, { shouldDirty: true });
    setConditionInput("");
  }

  function removeCondition(index: number) {
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next);
    form.setValue("medical_conditions_checklist", next, { shouldDirty: true });
  }

  // 5. Error Listeners (Auto-open accordions)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.insurance_company || errors.policy_number || errors.medical_clearance_status) setOpen((p) => ({ ...p, insurance: true }));
      if (errors.physical_height || errors.physical_weight || errors.physical_blood_pressure || errors.physical_pulse_rate || errors.pulse_irregularities) setOpen((p) => ({ ...p, vitals: true }));
      if (errors.healthcare_providers) setOpen((p) => ({ ...p, providers: true }));
      if (errors.uses_narcotics_alcohol || errors.pending_medical_exams || errors.trip_for_medical_care || errors.pending_surgery || errors.recent_hospitalizations || errors.medical_air_transport_rider || errors.alcohol_glasses_per_day || errors.seasickness_meds_pref) setOpen((p) => ({ ...p, screening: true }));
      if (errors.medical_conditions_checklist) setOpen((p) => ({ ...p, conditions: true }));
      if (errors.allergies || errors.medications || errors.dietary_restrictions || errors.psychiatric_history || errors.developmental_history || errors.treatment_history_details || errors.physical_accommodations || errors.general_accommodations) setOpen((p) => ({ ...p, history: true }));
      if (errors.vaccination_history) setOpen((p) => ({ ...p, vaccinations: true }));
      if (errors.hospitalization_history) setOpen((p) => ({ ...p, hospitalizations: true }));
    }, 0);
    return () => clearTimeout(timeout);
  }, [errors]);

  // 6. Save Handler (Bridges to Tier 4)
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

  // 7. Shorthand View-Mode Flags
  const viewFlags = {
    wPulseIrregularities: mp.pulse_irregularities ?? false,
    wUsesNarcotics: mp.uses_narcotics_alcohol ?? false,
    wPendingExams: mp.pending_medical_exams ?? false,
    wTripMedical: mp.trip_for_medical_care ?? false,
    wPendingSurgery: mp.pending_surgery ?? false,
    wRecentHosp: mp.recent_hospitalizations ?? false,
    wAirTransport: mp.medical_air_transport_rider ?? false,
  };

  return {
    form,
    accordions: { open, toggle: toggleSection },
    conditionsList: { conditions, conditionInput, setConditionInput, addCondition, removeCondition },
    arrays: { providers: providersArray, vaccinations: vaccinationsArray, hospitalizations: hospitalizationsArray },
    viewFlags,
    mp, // Needed strictly to derive read-only vaccination status check
    submission: { isSaving, onSubmit },
  };
}