"use client";

import { useState, useEffect } from "react";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  medicalProfileSchema,
  MEDICAL_CLEARANCE_STATUS,
  type MedicalProfile,
  type HealthcareProvider,
  type Vaccination,
  type Hospitalization,
} from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
}

// ─── Empty record templates ───────────────────────────────────────────────────

const EMPTY_PROVIDER: HealthcareProvider = {
  name: "", specialty: "", phone: "", email: "", facility: "", last_appt: "",
};

const EMPTY_VACCINATION: Vaccination = {
  type: "", received: false, date: "",
};

const EMPTY_HOSPITALIZATION: Hospitalization = {
  type: "", date: "", description: "",
};

// ─── Shared styling helpers ───────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function textareaCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[80px]",
    "placeholder:text-slate-400",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

// View-mode classes (clean typography, no interactive chrome)
const VIEW_INPUT_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_SELECT_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none appearance-none";
const VIEW_TEXTAREA_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

/** Human-readable label for enum values (title-case, underscores → spaces). */
function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  error,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}



// ─── Boolean badge (view-mode display for boolean flags) ──────────────────────

function BooleanBadge({
  value,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        value
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
}

// ─── Sanitize helper (strips undefined before Firestore write) ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitize(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          return [k, sanitize(v)];
        }
        return [k, v];
      })
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MedicalTab
 *
 * Tab 2 of ClientProfileDashboard — a comprehensive medical profile form
 * covering insurance, physical vitals, healthcare providers, screening flags,
 * medical history, conditions checklist, vaccination history, and
 * hospitalization history.
 *
 * Owns its own react-hook-form instance and writes to Firestore
 * `medical_profile` nested field on "Save Changes".
 */
export default function MedicalTab({ client, isEditable }: MedicalTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  // ── Accordion open/close state (section 1 open, rest closed) ─────────────────
  const [open, setOpen] = useState({
    insurance:      true,
    vitals:         false,
    providers:      false,
    screening:      false,
    conditions:     false,
    history:        false,
    vaccinations:   false,
    hospitalizations: false,
  });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  const [conditionInput, setConditionInput] = useState("");

  const mp = client.medical_profile ?? {};

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<MedicalProfile>({
    resolver: zodResolver(medicalProfileSchema),
    mode: "onTouched",
    defaultValues: {
      // ── Insurance & Clearance ──────────────────────────────────────────
      insurance_company:        mp.insurance_company        ?? "",
      policy_number:            mp.policy_number            ?? "",
      medical_clearance_status: mp.medical_clearance_status ?? undefined,

      // ── Physical Vitals ────────────────────────────────────────────────
      physical_height:         mp.physical_height         ?? "",
      physical_weight:         mp.physical_weight         ?? "",
      physical_blood_pressure: mp.physical_blood_pressure ?? "",
      physical_pulse_rate:     mp.physical_pulse_rate     ?? "",
      pulse_irregularities:    mp.pulse_irregularities    ?? false,

      // ── Screening ─────────────────────────────────────────────────────
      uses_narcotics_alcohol:      mp.uses_narcotics_alcohol      ?? false,
      pending_medical_exams:       mp.pending_medical_exams       ?? false,
      trip_for_medical_care:       mp.trip_for_medical_care       ?? false,
      pending_surgery:             mp.pending_surgery             ?? false,
      recent_hospitalizations:     mp.recent_hospitalizations     ?? false,
      medical_air_transport_rider: mp.medical_air_transport_rider ?? false,
      alcohol_glasses_per_day:     mp.alcohol_glasses_per_day     ?? "",
      seasickness_meds_pref:       mp.seasickness_meds_pref       ?? "",

      // ── Medical History ────────────────────────────────────────────────
      allergies:                 mp.allergies                 ?? "",
      medications:               mp.medications               ?? "",
      dietary_restrictions:      mp.dietary_restrictions      ?? "",
      psychiatric_history:       mp.psychiatric_history       ?? "",
      developmental_history:     mp.developmental_history     ?? "",
      treatment_history_details: mp.treatment_history_details ?? "",
      physical_accommodations:   mp.physical_accommodations   ?? "",
      general_accommodations:    mp.general_accommodations    ?? "",

      // ── Conditions Checklist ───────────────────────────────────────────
      medical_conditions_checklist: mp.medical_conditions_checklist ?? [],

      // ── Dynamic Arrays ─────────────────────────────────────────────────
      healthcare_providers: (mp.healthcare_providers ?? []).map((p) => ({
        name:      p.name      ?? "",
        specialty: p.specialty ?? "",
        phone:     p.phone     ?? "",
        email:     p.email     ?? "",
        facility:  p.facility  ?? "",
        last_appt: p.last_appt ?? "",
      })),
      vaccination_history: (mp.vaccination_history ?? []).map((v) => ({
        type:     v.type     ?? "",
        received: v.received ?? false,
        date:     v.date     ?? "",
      })),
      hospitalization_history: (mp.hospitalization_history ?? []).map((h) => ({
        type:        h.type        ?? "",
        date:        h.date        ?? "",
        description: h.description ?? "",
      })),
    },
  });

  // ── Field arrays ─────────────────────────────────────────────────────────────

  const {
    fields: providerFields,
    append: appendProvider,
    remove: removeProvider,
  } = useFieldArray({ control, name: "healthcare_providers" });

  const {
    fields: vaccinationFields,
    append: appendVaccination,
    remove: removeVaccination,
  } = useFieldArray({ control, name: "vaccination_history" });

  const {
    fields: hospitalizationFields,
    append: appendHospitalization,
    remove: removeHospitalization,
  } = useFieldArray({ control, name: "hospitalization_history" });

  // ── Conditions checklist (managed via local state for view sync) ─────────────
  // `conditions` mirrors the form field; updated via setValue + setConditions together.
  const [conditions, setConditions] = useState<string[]>(
    mp.medical_conditions_checklist ?? []
  );

  // ── Shorthand booleans from prop (for view-mode badges) ─────────────────────
  const wPulseIrregularities    = mp.pulse_irregularities          ?? false;
  const wUsesNarcotics          = mp.uses_narcotics_alcohol         ?? false;
  const wPendingExams           = mp.pending_medical_exams          ?? false;
  const wTripMedical            = mp.trip_for_medical_care          ?? false;
  const wPendingSurgery         = mp.pending_surgery                ?? false;
  const wRecentHosp             = mp.recent_hospitalizations        ?? false;
  const wAirTransport           = mp.medical_air_transport_rider    ?? false;

  // ── Conditions checklist helpers ──────────────────────────────────────────────

  function addCondition() {
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    const next = [...conditions, trimmed];
    setConditions(next);
    setValue("medical_conditions_checklist", next, { shouldDirty: true });
    setConditionInput("");
  }

  function removeCondition(index: number) {
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next);
    setValue("medical_conditions_checklist", next, { shouldDirty: true });
  }

  // ── Auto-expand sections with validation errors ────────────────────────────────

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.insurance_company || errors.policy_number || errors.medical_clearance_status) {
        setOpen((prev) => ({ ...prev, insurance: true }));
      }
      if (errors.physical_height || errors.physical_weight || errors.physical_blood_pressure || errors.physical_pulse_rate || errors.pulse_irregularities) {
        setOpen((prev) => ({ ...prev, vitals: true }));
      }
      if (errors.healthcare_providers) {
        setOpen((prev) => ({ ...prev, providers: true }));
      }
      if (errors.uses_narcotics_alcohol || errors.pending_medical_exams || errors.trip_for_medical_care || errors.pending_surgery || errors.recent_hospitalizations || errors.medical_air_transport_rider || errors.alcohol_glasses_per_day || errors.seasickness_meds_pref) {
        setOpen((prev) => ({ ...prev, screening: true }));
      }
      if (errors.medical_conditions_checklist) {
        setOpen((prev) => ({ ...prev, conditions: true }));
      }
      if (errors.allergies || errors.medications || errors.dietary_restrictions || errors.psychiatric_history || errors.developmental_history || errors.treatment_history_details || errors.physical_accommodations || errors.general_accommodations) {
        setOpen((prev) => ({ ...prev, history: true }));
      }
      if (errors.vaccination_history) {
        setOpen((prev) => ({ ...prev, vaccinations: true }));
      }
      if (errors.hospitalization_history) {
        setOpen((prev) => ({ ...prev, hospitalizations: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    errors.insurance_company, errors.policy_number, errors.medical_clearance_status,
    errors.physical_height, errors.physical_weight, errors.physical_blood_pressure, errors.physical_pulse_rate, errors.pulse_irregularities,
    errors.healthcare_providers,
    errors.uses_narcotics_alcohol, errors.pending_medical_exams, errors.trip_for_medical_care, errors.pending_surgery, errors.recent_hospitalizations, errors.medical_air_transport_rider, errors.alcohol_glasses_per_day, errors.seasickness_meds_pref,
    errors.medical_conditions_checklist,
    errors.allergies, errors.medications, errors.dietary_restrictions, errors.psychiatric_history, errors.developmental_history, errors.treatment_history_details, errors.physical_accommodations, errors.general_accommodations,
    errors.vaccination_history,
    errors.hospitalization_history,
  ]);

  // ── Save handler ──────────────────────────────────────────────────────────────

  async function onSubmit(data: MedicalProfile) {
    setIsSaving(true);
    try {
      const docRef = doc(db!, "clients", client.id);
      await updateDoc(docRef, {
        medical_profile: sanitize(data as Record<string, unknown>),
        updated_at: serverTimestamp(),
      });
      toast.success("Medical profile saved successfully.");
    } catch (err) {
      console.error("[MedicalTab] Firestore update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Insurance & Clearance ════ */}
          <AccordionSection
            title="Insurance & Clearance"
            description="Health insurance details and program medical clearance status."
            isOpen={open.insurance}
            onToggle={() => toggleSection("insurance")}
            hasError={!!(errors.insurance_company || errors.policy_number || errors.medical_clearance_status)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper
                label="Insurance Company"
                htmlFor="med-insurance_company"
                error={errors.insurance_company?.message}
              >
                <input
                  id="med-insurance_company"
                  type="text"
                  placeholder="e.g. Harel, Phoenix, Menora"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.insurance_company) : VIEW_INPUT_CLS}
                  {...register("insurance_company")}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Policy Number"
                htmlFor="med-policy_number"
                error={errors.policy_number?.message}
              >
                <input
                  id="med-policy_number"
                  type="text"
                  placeholder="e.g. POL-12345"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.policy_number) : VIEW_INPUT_CLS}
                  {...register("policy_number")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Medical Clearance Status"
                  htmlFor="med-medical_clearance_status"
                  error={errors.medical_clearance_status?.message}
                >
                  <select
                    id="med-medical_clearance_status"
                    disabled={!isEditable}
                    className={isEditable ? selectCls(!!errors.medical_clearance_status) : VIEW_SELECT_CLS}
                    {...register("medical_clearance_status")}
                  >
                    <option value="">Select clearance status…</option>
                    {MEDICAL_CLEARANCE_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {humanize(s)}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Physical Vitals ════ */}
          <AccordionSection
            title="Physical Vitals"
            description="Physical measurements recorded at intake."
            isOpen={open.vitals}
            onToggle={() => toggleSection("vitals")}
            hasError={!!(errors.physical_height || errors.physical_weight || errors.physical_blood_pressure || errors.physical_pulse_rate || errors.pulse_irregularities)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper
                label="Height"
                htmlFor="med-physical_height"
                error={errors.physical_height?.message}
              >
                <input
                  id="med-physical_height"
                  type="text"
                  placeholder='e.g. 5&apos;10" or 178 cm'
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_height) : VIEW_INPUT_CLS}
                  {...register("physical_height")}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Weight"
                htmlFor="med-physical_weight"
                error={errors.physical_weight?.message}
              >
                <input
                  id="med-physical_weight"
                  type="text"
                  placeholder="e.g. 72 kg or 158 lbs"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_weight) : VIEW_INPUT_CLS}
                  {...register("physical_weight")}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Blood Pressure"
                htmlFor="med-physical_blood_pressure"
                error={errors.physical_blood_pressure?.message}
              >
                <input
                  id="med-physical_blood_pressure"
                  type="text"
                  placeholder="e.g. 120/80 mmHg"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_blood_pressure) : VIEW_INPUT_CLS}
                  {...register("physical_blood_pressure")}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Pulse Rate"
                htmlFor="med-physical_pulse_rate"
                error={errors.physical_pulse_rate?.message}
              >
                <input
                  id="med-physical_pulse_rate"
                  type="text"
                  placeholder="e.g. 72 bpm"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_pulse_rate) : VIEW_INPUT_CLS}
                  {...register("physical_pulse_rate")}
                />
              </FieldWrapper>

              {/* Pulse Irregularities — full width */}
              <div className="sm:col-span-2">
                {isEditable ? (
                  <label
                    htmlFor="med-pulse_irregularities"
                    className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <input
                      id="med-pulse_irregularities"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      {...register("pulse_irregularities")}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Pulse Irregularities Noted
                    </span>
                  </label>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-700">
                      Pulse Irregularities
                    </span>
                    <BooleanBadge value={wPulseIrregularities} />
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 3: Healthcare Providers ════ */}
          <AccordionSection
            title="Healthcare Providers"
            description="Physicians, specialists, and other care providers."
            isOpen={open.providers}
            onToggle={() => toggleSection("providers")}
            hasError={!!errors.healthcare_providers}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button"
                  id="btn-providers-add"
                  onClick={() => appendProvider(EMPTY_PROVIDER)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Provider
                </button>
              </div>
            )}

            {providerFields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No healthcare providers added yet.
                  {isEditable && (
                    <>
                      {" "}Click{" "}
                      <strong className="text-slate-600">
                        &quot;+ Add Provider&quot;
                      </strong>{" "}
                      above to get started.
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {providerFields.map((field, index) => {
                const providerErrors = errors.healthcare_providers as
                  | Record<number, Record<string, { message?: string }>>
                  | undefined;
                const pe = providerErrors?.[index];

                return (
                  <div
                    key={field.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">
                        Provider #{index + 1}
                      </h3>
                      {isEditable && (
                        <button
                          type="button"
                          id={`btn-providers-remove-${index}`}
                          onClick={() => removeProvider(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper
                        label="Name"
                        htmlFor={`pv-name-${index}`}
                        error={pe?.name?.message}
                      >
                        <input
                          id={`pv-name-${index}`}
                          type="text"
                          placeholder="e.g. Dr. Sarah Cohen"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.name) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.name`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Specialty"
                        htmlFor={`pv-specialty-${index}`}
                        error={pe?.specialty?.message}
                      >
                        <input
                          id={`pv-specialty-${index}`}
                          type="text"
                          placeholder="e.g. Cardiologist, GP"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.specialty) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.specialty`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Phone"
                        htmlFor={`pv-phone-${index}`}
                        error={pe?.phone?.message}
                      >
                        <input
                          id={`pv-phone-${index}`}
                          type="tel"
                          placeholder="e.g. 03-1234567"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.phone) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.phone`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Email"
                        htmlFor={`pv-email-${index}`}
                        error={pe?.email?.message}
                      >
                        <input
                          id={`pv-email-${index}`}
                          type="email"
                          placeholder="e.g. dr.cohen@clinic.com"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.email) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.email`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Facility / Clinic"
                        htmlFor={`pv-facility-${index}`}
                        error={pe?.facility?.message}
                      >
                        <input
                          id={`pv-facility-${index}`}
                          type="text"
                          placeholder="e.g. Ichilov Medical Center"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.facility) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.facility`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Last Appointment"
                        htmlFor={`pv-last_appt-${index}`}
                        error={pe?.last_appt?.message}
                      >
                        <input
                          id={`pv-last_appt-${index}`}
                          type="date"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.last_appt) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.last_appt`)}
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 4: Screening Questions ════ */}
          <AccordionSection
            title="Screening Questions"
            description="Health screening flags completed during intake."
            isOpen={open.screening}
            onToggle={() => toggleSection("screening")}
            hasError={!!(errors.uses_narcotics_alcohol || errors.pending_medical_exams || errors.trip_for_medical_care || errors.pending_surgery || errors.recent_hospitalizations || errors.medical_air_transport_rider || errors.alcohol_glasses_per_day || errors.seasickness_meds_pref)}
          >
            <div className="space-y-5">
              {/* Boolean flag grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "med-uses_narcotics_alcohol",
                      watchedValue: wUsesNarcotics,
                      name: "uses_narcotics_alcohol" as const,
                      label: "Uses Narcotics / Alcohol",
                    },
                    {
                      id: "med-pending_medical_exams",
                      watchedValue: wPendingExams,
                      name: "pending_medical_exams" as const,
                      label: "Pending Medical Exams",
                    },
                    {
                      id: "med-trip_for_medical_care",
                      watchedValue: wTripMedical,
                      name: "trip_for_medical_care" as const,
                      label: "Trip Taken for Medical Care",
                    },
                    {
                      id: "med-pending_surgery",
                      watchedValue: wPendingSurgery,
                      name: "pending_surgery" as const,
                      label: "Pending Surgery",
                    },
                    {
                      id: "med-recent_hospitalizations",
                      watchedValue: wRecentHosp,
                      name: "recent_hospitalizations" as const,
                      label: "Recent Hospitalizations",
                    },
                    {
                      id: "med-medical_air_transport_rider",
                      watchedValue: wAirTransport,
                      name: "medical_air_transport_rider" as const,
                      label: "Medical Air Transport Rider",
                    },
                  ] satisfies {
                    id: string;
                    watchedValue: boolean;
                    name: keyof MedicalProfile;
                    label: string;
                  }[]
                ).map(({ id, name, label, watchedValue }) =>
                  isEditable ? (
                    <label
                      key={id}
                      htmlFor={id}
                      className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register(name)}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {label}
                      </span>
                    </label>
                  ) : (
                    <div key={id} className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-slate-700">
                        {label}
                      </span>
                      <BooleanBadge value={watchedValue} />
                    </div>
                  )
                )}
              </div>

              {/* Numeric / text supplements */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldWrapper
                  label="Alcoholic Drinks per Day"
                  htmlFor="med-alcohol_glasses_per_day"
                  error={errors.alcohol_glasses_per_day?.message}
                >
                  <input
                    id="med-alcohol_glasses_per_day"
                    type="text"
                    placeholder="e.g. 0, 1–2, 3+"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.alcohol_glasses_per_day) : VIEW_INPUT_CLS}
                    {...register("alcohol_glasses_per_day")}
                  />
                </FieldWrapper>

                <FieldWrapper
                  label="Seasickness Medication Preference"
                  htmlFor="med-seasickness_meds_pref"
                  error={errors.seasickness_meds_pref?.message}
                >
                  <input
                    id="med-seasickness_meds_pref"
                    type="text"
                    placeholder="e.g. Dramamine, patch, none"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.seasickness_meds_pref) : VIEW_INPUT_CLS}
                    {...register("seasickness_meds_pref")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 5: Medical Conditions ════ */}
          <AccordionSection
            title="Medical Conditions"
            description="A free-form list of known medical conditions or diagnoses."
            isOpen={open.conditions}
            onToggle={() => toggleSection("conditions")}
            hasError={!!errors.medical_conditions_checklist}
          >

            {/* Add condition input — edit mode only */}
            {isEditable && (
              <div className="mb-4 flex gap-3">
                <input
                  id="med-condition-input"
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCondition();
                    }
                  }}
                  placeholder="Type a condition and press Enter or click Add…"
                  className={inputCls(false) + " flex-1"}
                />
                <button
                  type="button"
                  id="btn-conditions-add"
                  onClick={addCondition}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add
                </button>
              </div>
            )}

            {/* Conditions tag list / empty state */}
            {conditions.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                <p className="text-sm text-slate-400">
                  {isEditable
                    ? 'No conditions listed. Type one above and click "+ Add".'
                    : "No medical conditions recorded."}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-medium text-blue-800 ring-1 ring-blue-200"
                  >
                    {condition}
                    {isEditable && (
                      <button
                        type="button"
                        id={`btn-conditions-remove-${index}`}
                        onClick={() => removeCondition(index)}
                        className="ml-0.5 rounded-full text-blue-400 transition-colors hover:text-red-600 focus:outline-none"
                        aria-label={`Remove ${condition}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </AccordionSection>

          {/* ════ Section 6: Medical History & Accommodations ════ */}
          <AccordionSection
            title="Medical History & Accommodations"
            description="Detailed history, treatment records, and special accommodation needs."
            isOpen={open.history}
            onToggle={() => toggleSection("history")}
            hasError={!!(errors.allergies || errors.medications || errors.dietary_restrictions || errors.psychiatric_history || errors.developmental_history || errors.treatment_history_details || errors.physical_accommodations || errors.general_accommodations)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Allergies"
                  htmlFor="med-allergies"
                  error={errors.allergies?.message}
                >
                  <textarea
                    id="med-allergies"
                    placeholder="List any known allergies (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.allergies) : VIEW_TEXTAREA_CLS}
                    {...register("allergies")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Current Medications"
                  htmlFor="med-medications"
                  error={errors.medications?.message}
                >
                  <textarea
                    id="med-medications"
                    placeholder="Current medications and dosages (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.medications) : VIEW_TEXTAREA_CLS}
                    {...register("medications")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Dietary Restrictions"
                  htmlFor="med-dietary_restrictions"
                  error={errors.dietary_restrictions?.message}
                >
                  <textarea
                    id="med-dietary_restrictions"
                    placeholder="Dietary needs or restrictions (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.dietary_restrictions) : VIEW_TEXTAREA_CLS}
                    {...register("dietary_restrictions")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Psychiatric History"
                  htmlFor="med-psychiatric_history"
                  error={errors.psychiatric_history?.message}
                >
                  <textarea
                    id="med-psychiatric_history"
                    placeholder="Any psychiatric history, diagnoses, or treatment (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.psychiatric_history) : VIEW_TEXTAREA_CLS}
                    {...register("psychiatric_history")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Developmental History"
                  htmlFor="med-developmental_history"
                  error={errors.developmental_history?.message}
                >
                  <textarea
                    id="med-developmental_history"
                    placeholder="Developmental milestones, delays, or special needs (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.developmental_history) : VIEW_TEXTAREA_CLS}
                    {...register("developmental_history")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Treatment History Details"
                  htmlFor="med-treatment_history_details"
                  error={errors.treatment_history_details?.message}
                >
                  <textarea
                    id="med-treatment_history_details"
                    placeholder="Ongoing or past treatments, therapies, or procedures (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.treatment_history_details) : VIEW_TEXTAREA_CLS}
                    {...register("treatment_history_details")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Physical Accommodations"
                  htmlFor="med-physical_accommodations"
                  error={errors.physical_accommodations?.message}
                >
                  <textarea
                    id="med-physical_accommodations"
                    placeholder="Physical accessibility needs or required accommodations (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.physical_accommodations) : VIEW_TEXTAREA_CLS}
                    {...register("physical_accommodations")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper
                  label="General Accommodations"
                  htmlFor="med-general_accommodations"
                  error={errors.general_accommodations?.message}
                >
                  <textarea
                    id="med-general_accommodations"
                    placeholder="Any other accommodations or special requirements (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.general_accommodations) : VIEW_TEXTAREA_CLS}
                    {...register("general_accommodations")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 7: Vaccination History ════ */}
          <AccordionSection
            title="Vaccination History"
            description="Immunizations received, pending, or declined."
            isOpen={open.vaccinations}
            onToggle={() => toggleSection("vaccinations")}
            hasError={!!errors.vaccination_history}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button"
                  id="btn-vaccinations-add"
                  onClick={() => appendVaccination(EMPTY_VACCINATION)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Vaccination
                </button>
              </div>
            )}

            {vaccinationFields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No vaccination records added yet.
                  {isEditable && (
                    <>
                      {" "}Click{" "}
                      <strong className="text-slate-600">
                        &quot;+ Add Vaccination&quot;
                      </strong>{" "}
                      to add one.
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {vaccinationFields.map((field, index) => {
                const vaccinationErrors = errors.vaccination_history as
                  | Record<number, Record<string, { message?: string }>>
                  | undefined;
                const ve = vaccinationErrors?.[index];
                const isReceived =
                  vaccinationFields[index]
                    ? (mp.vaccination_history?.[index]?.received ?? false)
                    : false;

                return (
                  <div
                    key={field.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">
                        Vaccination #{index + 1}
                      </h3>
                      {isEditable && (
                        <button
                          type="button"
                          id={`btn-vaccinations-remove-${index}`}
                          onClick={() => removeVaccination(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FieldWrapper
                        label="Vaccine Type"
                        htmlFor={`vx-type-${index}`}
                        error={ve?.type?.message}
                      >
                        <input
                          id={`vx-type-${index}`}
                          type="text"
                          placeholder="e.g. COVID-19, Flu, MMR"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!ve?.type) : VIEW_INPUT_CLS}
                          {...register(`vaccination_history.${index}.type`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Date Administered"
                        htmlFor={`vx-date-${index}`}
                        error={ve?.date?.message}
                      >
                        <input
                          id={`vx-date-${index}`}
                          type="date"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!ve?.date) : VIEW_INPUT_CLS}
                          {...register(`vaccination_history.${index}.date`)}
                        />
                      </FieldWrapper>

                      {/* Received */}
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-700">
                          Status
                        </span>
                        {isEditable ? (
                          <label
                            htmlFor={`vx-received-${index}`}
                            className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
                          >
                            <input
                              id={`vx-received-${index}`}
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              {...register(`vaccination_history.${index}.received`)}
                            />
                            <span className="text-sm font-medium text-slate-700">
                              Received
                            </span>
                          </label>
                        ) : (
                          <BooleanBadge
                            value={isReceived}
                            trueLabel="Received"
                            falseLabel="Not received"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 8: Hospitalization History ════ */}
          <AccordionSection
            title="Hospitalization History"
            description="Past hospitalizations, surgeries, and significant medical events."
            isOpen={open.hospitalizations}
            onToggle={() => toggleSection("hospitalizations")}
            hasError={!!errors.hospitalization_history}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button"
                  id="btn-hospitalizations-add"
                  onClick={() => appendHospitalization(EMPTY_HOSPITALIZATION)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Event
                </button>
              </div>
            )}

            {hospitalizationFields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No hospitalization records added yet.
                  {isEditable && (
                    <>
                      {" "}Click{" "}
                      <strong className="text-slate-600">
                        &quot;+ Add Event&quot;
                      </strong>{" "}
                      to add one.
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {hospitalizationFields.map((field, index) => {
                const hospitalizationErrors = errors.hospitalization_history as
                  | Record<number, Record<string, { message?: string }>>
                  | undefined;
                const he = hospitalizationErrors?.[index];

                return (
                  <div
                    key={field.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">
                        Event #{index + 1}
                      </h3>
                      {isEditable && (
                        <button
                          type="button"
                          id={`btn-hospitalizations-remove-${index}`}
                          onClick={() => removeHospitalization(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper
                        label="Type / Reason"
                        htmlFor={`hz-type-${index}`}
                        error={he?.type?.message}
                      >
                        <input
                          id={`hz-type-${index}`}
                          type="text"
                          placeholder="e.g. Appendectomy, Cardiac Procedure"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!he?.type) : VIEW_INPUT_CLS}
                          {...register(`hospitalization_history.${index}.type`)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Date"
                        htmlFor={`hz-date-${index}`}
                        error={he?.date?.message}
                      >
                        <input
                          id={`hz-date-${index}`}
                          type="date"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(!!he?.date) : VIEW_INPUT_CLS}
                          {...register(`hospitalization_history.${index}.date`)}
                        />
                      </FieldWrapper>

                      <div className="sm:col-span-2">
                        <FieldWrapper
                          label="Description"
                          htmlFor={`hz-description-${index}`}
                          error={he?.description?.message}
                        >
                          <textarea
                            id={`hz-description-${index}`}
                            placeholder="Brief description of the hospitalization or medical event"
                            readOnly={!isEditable}
                            className={isEditable ? textareaCls(!!he?.description) : VIEW_TEXTAREA_CLS}
                            {...register(`hospitalization_history.${index}.description`)}
                          />
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

        </div>

        {/* ── Sticky footer with Save button (edit mode only) ── */}
        {isEditable && (
          <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
            {isDirty ? (
              <p className="text-xs font-medium text-amber-600">
                You have unsaved changes.
              </p>
            ) : (
              <p className="text-xs text-slate-400">All changes are saved.</p>
            )}
            <button
              type="submit"
              id="btn-medical-save"
              disabled={isSaving || !isDirty}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                isSaving || !isDirty
                  ? "cursor-not-allowed bg-indigo-300"
                  : "bg-indigo-600 hover:bg-indigo-700",
              ].join(" ")}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
