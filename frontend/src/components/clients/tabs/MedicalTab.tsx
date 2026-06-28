"use client";

import { AccordionSection } from "@/components/ui/AccordionSection";
import { useWatch } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type {
  HealthcareProvider,
  Allergy,
  Medication,
  Hospitalization,
  MedicalProfile,
} from "@/schema/medicalSchema";
import {
  HOSPITALIZATION_TYPES,
  VACCINATION_STATUS_OPTIONS,
} from "@/schema/medicalSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import CustomFieldsSection from "@/components/clients/fields/CustomFieldsSection";

import {
  useMedicalTabController,
  EMPTY_PROVIDER,
  EMPTY_ALLERGY,
  EMPTY_MEDICATION,
  EMPTY_HOSPITALIZATION,
} from "./controllers/MedicalTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  client: ClientDoc;
  isEditable: boolean;
}

// ─── Shared styling helpers ───────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function textareaCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[80px]",
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

const VIEW_INPUT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_TEXTAREA_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

// ─── Sub-Components ───────────────────────────────────────────────────────────

function FieldWrapper({
  label, htmlFor, error, required = false, children,
}: {
  label: string; htmlFor: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function BooleanBadge({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string; }) {
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"].join(" ")}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{children}</h4>;
}

// ─── Checkbox helper ─────────────────────────────────────────────────────────

function CheckboxField({
  id, label, isEditable, registered, viewValue,
}: {
  id: string; label: string; isEditable: boolean;
  registered: React.InputHTMLAttributes<HTMLInputElement>;
  viewValue: boolean;
}) {
  if (isEditable) {
    return (
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50">
        <input id={id} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" {...registered} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <BooleanBadge value={viewValue} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MedicalTab({ client, isEditable }: MedicalTabProps) {
  const { form, accordions, arrays, submission } = useMedicalTabController(client);
  const { register, control, formState: { errors, isDirty }, handleSubmit } = form;

  // Watch seasickness_meds for conditional rendering
  const seasicknessMeds = useWatch({ control, name: "seasickness_meds" });
  const showSeasicknessSpecify =
    seasicknessMeds?.can_take_if_necessary ||
    seasicknessMeds?.can_take_any_if_needed;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Healthcare Providers ════ */}
          <AccordionSection
            title="Healthcare Providers"
            description="Physicians, specialists, and other care providers."
            isOpen={accordions.open.providers}
            onToggle={() => accordions.toggle("providers")}
            hasError={!!errors.healthcare_providers}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button" onClick={() => arrays.providers.append(EMPTY_PROVIDER)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Provider
                </button>
              </div>
            )}

            {arrays.providers.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No healthcare providers added yet.
                  {isEditable && <> Click <strong className="text-slate-600">&quot;+ Add Provider&quot;</strong> above to get started.</>}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {arrays.providers.fields.map((field, index) => {
                const pe = (errors.healthcare_providers as FieldErrors<HealthcareProvider>[])?.[index];
                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Provider #{index + 1}</h3>
                      {isEditable && (
                        <button type="button" onClick={() => arrays.providers.remove(index)} className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Name" htmlFor={`pv-name-${index}`} error={pe?.name?.message}>
                        <input id={`pv-name-${index}`} type="text" placeholder="e.g. Dr. Sarah Cohen" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.name) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.name` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Specialty" htmlFor={`pv-specialty-${index}`} error={pe?.specialty?.message}>
                        <input id={`pv-specialty-${index}`} type="text" placeholder="e.g. Cardiologist, GP" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.specialty) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.specialty` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Phone" htmlFor={`pv-phone-${index}`} error={pe?.phone?.message}>
                        <input id={`pv-phone-${index}`} type="tel" placeholder="e.g. 03-1234567" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.phone) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.phone` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Email" htmlFor={`pv-email-${index}`} error={pe?.email?.message}>
                        <input id={`pv-email-${index}`} type="email" placeholder="e.g. dr.cohen@clinic.com" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.email) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.email` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Facility / Clinic" htmlFor={`pv-facility-${index}`} error={pe?.facility?.message}>
                        <input id={`pv-facility-${index}`} type="text" placeholder="e.g. Ichilov Medical Center" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.facility) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.facility` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Last Appointment" htmlFor={`pv-last_appt-${index}`} error={pe?.last_appt?.message}>
                        <input id={`pv-last_appt-${index}`} type="date" readOnly={!isEditable} className={isEditable ? inputCls(!!pe?.last_appt) : VIEW_INPUT_CLS} {...register(`healthcare_providers.${index}.last_appt` as const)} />
                      </FieldWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 2: Allergies ════ */}
          <AccordionSection
            title="Allergies"
            description="Known allergens and their severity."
            isOpen={accordions.open.allergies}
            onToggle={() => accordions.toggle("allergies")}
            hasError={!!errors.allergies}
          >
            {isEditable && (
              <div className="mb-5">
                <button type="button" onClick={() => arrays.allergies.append(EMPTY_ALLERGY)} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
                  + Add Allergy
                </button>
              </div>
            )}

            {arrays.allergies.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                <p className="text-sm text-slate-400">{isEditable ? 'No allergies listed. Click "+ Add Allergy" above.' : "No allergies recorded."}</p>
              </div>
            )}

            <div className="space-y-4">
              {arrays.allergies.fields.map((field, index) => {
                const ae = (errors.allergies as FieldErrors<Allergy>[])?.[index];
                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Allergy #{index + 1}</h3>
                      {isEditable && (
                        <button type="button" onClick={() => arrays.allergies.remove(index)} className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Allergen" htmlFor={`al-allergen-${index}`} error={ae?.allergen?.message}>
                        <input id={`al-allergen-${index}`} type="text" placeholder="e.g. Peanuts, Penicillin, Latex" readOnly={!isEditable} className={isEditable ? inputCls(!!ae?.allergen) : VIEW_INPUT_CLS} {...register(`allergies.${index}.allergen` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Reaction / Severity" htmlFor={`al-severity-${index}`} error={ae?.reaction_severity?.message}>
                        <input id={`al-severity-${index}`} type="text" placeholder="e.g. Mild rash, Anaphylaxis" readOnly={!isEditable} className={isEditable ? inputCls(!!ae?.reaction_severity) : VIEW_INPUT_CLS} {...register(`allergies.${index}.reaction_severity` as const)} />
                      </FieldWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 3: Medications ════ */}
          <AccordionSection
            title="Current Medications"
            description="All current medications, dosages, and frequencies."
            isOpen={accordions.open.medications}
            onToggle={() => accordions.toggle("medications")}
            hasError={!!errors.medications}
          >
            {isEditable && (
              <div className="mb-5">
                <button type="button" onClick={() => arrays.medications.append(EMPTY_MEDICATION)} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
                  + Add Medication
                </button>
              </div>
            )}

            {arrays.medications.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                <p className="text-sm text-slate-400">{isEditable ? 'No medications listed. Click "+ Add Medication" above.' : "No medications recorded."}</p>
              </div>
            )}

            <div className="space-y-4">
              {arrays.medications.fields.map((field, index) => {
                const me = (errors.medications as FieldErrors<Medication>[])?.[index];
                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Medication #{index + 1}</h3>
                      {isEditable && (
                        <button type="button" onClick={() => arrays.medications.remove(index)} className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Medication Name" htmlFor={`med-mname-${index}`} error={me?.name?.message}>
                        <input id={`med-mname-${index}`} type="text" placeholder="e.g. Metformin" readOnly={!isEditable} className={isEditable ? inputCls(!!me?.name) : VIEW_INPUT_CLS} {...register(`medications.${index}.name` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Frequency" htmlFor={`med-mfreq-${index}`} error={me?.frequency?.message}>
                        <input id={`med-mfreq-${index}`} type="text" placeholder="e.g. Twice daily" readOnly={!isEditable} className={isEditable ? inputCls(!!me?.frequency) : VIEW_INPUT_CLS} {...register(`medications.${index}.frequency` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Dose" htmlFor={`med-mdose-${index}`} error={me?.dose?.message}>
                        <input id={`med-mdose-${index}`} type="text" placeholder="e.g. 500 mg" readOnly={!isEditable} className={isEditable ? inputCls(!!me?.dose) : VIEW_INPUT_CLS} {...register(`medications.${index}.dose` as const)} />
                      </FieldWrapper>
                      <FieldWrapper label="Route" htmlFor={`med-mroute-${index}`} error={me?.route?.message}>
                        <input id={`med-mroute-${index}`} type="text" placeholder="e.g. Oral, Topical, IV" readOnly={!isEditable} className={isEditable ? inputCls(!!me?.route) : VIEW_INPUT_CLS} {...register(`medications.${index}.route` as const)} />
                      </FieldWrapper>
                      <div className="sm:col-span-2">
                        <FieldWrapper label="Condition Treated" htmlFor={`med-mcond-${index}`} error={me?.condition?.message}>
                          <input id={`med-mcond-${index}`} type="text" placeholder="e.g. Type 2 Diabetes" readOnly={!isEditable} className={isEditable ? inputCls(!!me?.condition) : VIEW_INPUT_CLS} {...register(`medications.${index}.condition` as const)} />
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 4: Seasickness Medications ════ */}
          <AccordionSection
            title="Seasickness Medications"
            description="Seasickness medication preferences and needs."
            isOpen={accordions.open.screening}
            onToggle={() => accordions.toggle("screening")}
            hasError={!!errors.seasickness_meds}
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["not_able_to_take",              "Not able to take"],
                  ["bringing_own_for_personal_use", "Bringing own for personal use"],
                  ["can_take_if_necessary",         "Can take if necessary"],
                  ["can_take_any_if_needed",        "Can take any if needed"],
                ] as const).map(([key, label]) => (
                  <CheckboxField key={key} id={`sea-${key}`} label={label} isEditable={isEditable}
                    registered={register(`seasickness_meds.${key}` as const)}
                    viewValue={(client.medical_profile as MedicalProfile | undefined)?.seasickness_meds?.[key] ?? false}
                  />
                ))}
              </div>

              {showSeasicknessSpecify && (
                <div className="mt-3">
                  <FieldWrapper label="Specify Seasickness Medication" htmlFor="sea-specify" error={errors.seasickness_meds?.specify_if_needed?.message}>
                    <input id="sea-specify" type="text" placeholder="e.g. Dramamine, Scopolamine patch" readOnly={!isEditable} className={isEditable ? inputCls(!!errors.seasickness_meds?.specify_if_needed) : VIEW_INPUT_CLS} {...register("seasickness_meds.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* ════ Section 5: Past Medical History ════ */}
          <AccordionSection
            title="Past Medical History"
            description="Systemic conditions by body system. Check all that apply."
            isOpen={accordions.open.pastHistory}
            onToggle={() => accordions.toggle("pastHistory")}
            hasError={!!errors.past_medical_history}
          >
            <div className="space-y-8">

              {/* Eyes & Ears */}
              <div>
                <SectionLabel>Eyes &amp; Ears</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["vision_problems",   "Vision Problems"],
                    ["hearing_problems",  "Hearing Problems"],
                    ["other_ear_problems","Other Ear Problems"],
                    ["vertigo",           "Vertigo (dizziness)"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-ee-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.eyes_ears.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.eyes_ears?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-ee-specify">
                    <input id="pmh-ee-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.eyes_ears.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Neurological */}
              <div>
                <SectionLabel>Neurological</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["hemiplegia",               "Hemiplegia"],
                    ["seizure_disorder_no_meds", "Seizure Disorder (No Meds)"],
                    ["epilepsy_on_meds",         "Epilepsy (On Meds)"],
                    ["loss_of_consciousness",    "Loss of Consciousness"],
                    ["depression",               "Depression"],
                    ["cerebral_palsy",           "Cerebral Palsy"],
                    ["other",                    "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-neuro-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.neurological.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.neurological?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-neuro-specify">
                    <input id="pmh-neuro-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.neurological.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Heart */}
              <div>
                <SectionLabel>Heart</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["heart_disease",      "Heart Disease"],
                    ["irregular_rhythm",   "Irregular Rhythm"],
                    ["atrial_fibrillation","Atrial Fibrillation"],
                    ["high_blood_pressure","High Blood Pressure"],
                    ["other",             "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-heart-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.heart.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.heart?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-heart-specify">
                    <input id="pmh-heart-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.heart.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Lungs */}
              <div>
                <SectionLabel>Lungs</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["copd",              "COPD (Chronic Obstructive Pulmonary Disease)"],
                    ["emphysema",         "Emphysema"],
                    ["asthma",            "Asthma"],
                    ["chronic_bronchitis","Chronic Bronchitis"],
                    ["other",             "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-lungs-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.lungs.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.lungs?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-lungs-specify">
                    <input id="pmh-lungs-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.lungs.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Endocrine */}
              <div>
                <SectionLabel>Endocrine / Blood</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["diabetes",            "Diabetes"],
                    ["diabetes_type_2",     "Diabetes Type 2"],
                    ["diabetes_type_1",     "Diabetes Type 1"],
                    ["pre_diabetes",        "Pre-Diabetes"],
                    ["hemophilia",          "Hemophilia"],
                    ["other_blood_disorder","Other Blood Disorder"],
                    ["other",              "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-endo-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.endocrine.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.endocrine?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-endo-specify">
                    <input id="pmh-endo-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.endocrine.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Liver / Pancreas / Kidney */}
              <div>
                <SectionLabel>Liver, Pancreas &amp; Kidney</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["liver_disease",       "Liver Disease"],
                    ["hepatitis",           "Hepatitis"],
                    ["chronic_pancreatitis","Chronic Pancreatitis"],
                    ["celiac",              "Celiac Disease (gluten sensitivity)"],
                    ["other",              "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-lpk-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.liver_pancreas_kidney.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.liver_pancreas_kidney?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-lpk-specify">
                    <input id="pmh-lpk-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.liver_pancreas_kidney.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Gastrointestinal */}
              <div>
                <SectionLabel>Gastrointestinal</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["ibd",                "IBD (Inflammatory Bowel Disease)"],
                    ["crohns",             "Crohn's Disease"],
                    ["peptic_ulcer",       "Peptic Ulcer"],
                    ["abnormal_weight_loss","Abnormal Weight Loss"],
                    ["other",             "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-gi-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.gastrointestinal.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.gastrointestinal?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-gi-specify">
                    <input id="pmh-gi-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.gastrointestinal.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Bone */}
              <div>
                <SectionLabel>Bone &amp; Musculoskeletal</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["vertebral_fractures",   "Vertebral Fracture(s)"],
                    ["hip_fractures",         "Hip Fracture(s)"],
                    ["other_fractures",       "Other Fractures (Specify)"],
                    ["structural_chronic_pain","Structural / Chronic Pain"],
                    ["other_issues",          "Other Issues"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-bone-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.bone.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.bone?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-bone-specify">
                    <input id="pmh-bone-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.bone.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

              {/* Skin & Circulatory */}
              <div>
                <SectionLabel>Skin &amp; Circulatory</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["skin_sore_ulcer",   "Skin Sore / Ulcer"],
                    ["non_healing_wounds","Non-Healing Wounds"],
                    ["other",            "Other"],
                  ] as const).map(([key, label]) => (
                    <CheckboxField key={key} id={`pmh-sc-${key}`} label={label} isEditable={isEditable}
                      registered={register(`past_medical_history.skin_circulatory.${key}` as const)}
                      viewValue={(client.medical_profile as MedicalProfile | undefined)?.past_medical_history?.skin_circulatory?.[key] ?? false}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <FieldWrapper label="Specify if needed" htmlFor="pmh-sc-specify">
                    <input id="pmh-sc-specify" type="text" placeholder="Additional details…" readOnly={!isEditable} className={isEditable ? inputCls(false) : VIEW_INPUT_CLS} {...register("past_medical_history.skin_circulatory.specify_if_needed")} />
                  </FieldWrapper>
                </div>
              </div>

            </div>
          </AccordionSection>

          {/* ════ Section 6: Vaccination History ════ */}
          <AccordionSection
            title="Vaccination History"
            description="Immunization status for standard vaccinations."
            isOpen={accordions.open.vaccinations}
            onToggle={() => accordions.toggle("vaccinations")}
            hasError={!!errors.vaccination_history}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 text-left font-semibold text-slate-600 pr-4">Vaccine</th>
                    <th className="py-2 text-left font-semibold text-slate-600 pr-4">Status</th>
                    <th className="py-2 text-left font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {([
                    ["tetanus_dtap",           "Tetanus / DTaP"],
                    ["tetanus_booster",        "Tetanus Booster"],
                    ["mmr",                    "MMR"],
                    ["covid_19",               "COVID-19"],
                    ["pneumonia",              "Pneumonia"],
                    ["haemophilus_influenzae", "Haemophilus Influenzae"],
                    ["varicella",              "Varicella (Chickenpox)"],
                    ["hepatitis_b",            "Hepatitis B"],
                    ["hepatitis_a",            "Hepatitis A"],
                    ["meningococcal",          "Meningococcal"],
                    ["tb_test",                "TB Test"],
                  ] as const).map(([key, label]) => (
                    <tr key={key}>
                      <td className="py-3 pr-4 font-medium text-slate-700 whitespace-nowrap">{label}</td>
                      <td className="py-3 pr-4">
                        {isEditable ? (
                          <select
                            className={selectCls(false) + " w-40"}
                            {...register(`vaccination_history.${key}.received` as const)}
                          >
                            <option value="">—</option>
                            {VACCINATION_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600">
                            {(client.medical_profile as MedicalProfile | undefined)?.vaccination_history?.[key]?.received ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <input
                          type="date"
                          readOnly={!isEditable}
                          className={isEditable ? inputCls(false) + " w-44" : VIEW_INPUT_CLS + " w-44"}
                          {...register(`vaccination_history.${key}.date` as const)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionSection>

          {/* ════ Section 7: Hospitalization History ════ */}
          <AccordionSection
            title="Hospitalization History"
            description="Past hospitalizations, major illnesses, and significant injuries."
            isOpen={accordions.open.hospitalizations}
            onToggle={() => accordions.toggle("hospitalizations")}
            hasError={!!errors.hospitalization_history}
          >
            {isEditable && (
              <div className="mb-5">
                <button type="button" onClick={() => arrays.hospitalizations.append(EMPTY_HOSPITALIZATION)} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
                  + Add Event
                </button>
              </div>
            )}

            {arrays.hospitalizations.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No records added yet.
                  {isEditable && <> Click <strong className="text-slate-600">&quot;+ Add Event&quot;</strong> to add one.</>}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {arrays.hospitalizations.fields.map((field, index) => {
                const he = (errors.hospitalization_history as FieldErrors<Hospitalization>[])?.[index];
                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Event #{index + 1}</h3>
                      {isEditable && (
                        <button type="button" onClick={() => arrays.hospitalizations.remove(index)} className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Type" htmlFor={`hz-type-${index}`} error={he?.type?.message}>
                        {isEditable ? (
                          <select id={`hz-type-${index}`} className={selectCls(!!he?.type)} {...register(`hospitalization_history.${index}.type` as const)}>
                            <option value="">Select type…</option>
                            {HOSPITALIZATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (
                          <input readOnly className={VIEW_INPUT_CLS} value={field.type ?? ""} />
                        )}
                      </FieldWrapper>
                      <FieldWrapper label="Date" htmlFor={`hz-date-${index}`} error={he?.date?.message}>
                        <input id={`hz-date-${index}`} type="date" readOnly={!isEditable} className={isEditable ? inputCls(!!he?.date) : VIEW_INPUT_CLS} {...register(`hospitalization_history.${index}.date` as const)} />
                      </FieldWrapper>
                      <div className="sm:col-span-2">
                        <FieldWrapper label="Description" htmlFor={`hz-description-${index}`} error={he?.description?.message}>
                          <textarea id={`hz-description-${index}`} placeholder="Brief description of the event" readOnly={!isEditable} className={isEditable ? textareaCls(!!he?.description) : VIEW_TEXTAREA_CLS} {...register(`hospitalization_history.${index}.description` as const)} />
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* ════ Section 8: Developmental History ════ */}
          <AccordionSection
            title="Developmental History"
            description="Early development, milestones, and childhood events."
            isOpen={accordions.open.developmental}
            onToggle={() => accordions.toggle("developmental")}
            hasError={!!errors.developmental_history}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {([
                ["pregnancy_complications", "Pregnancy Complications"],
                ["birth_complications",     "Birth Complications"],
                ["temperament",             "Temperament during the first year of life"],
                ["milestone_delays",        "Major Milestone Delays"],
                ["childhood_events",        "Significant Childhood Events"],
                ["social_emotional_delays", "Social / Emotional Delays"],
              ] as const).map(([key, label]) => (
                <div key={key} className="sm:col-span-2">
                  <FieldWrapper label={label} htmlFor={`dev-${key}`}>
                    <textarea id={`dev-${key}`} placeholder={`Describe ${label.toLowerCase()}…`} readOnly={!isEditable}
                      className={isEditable ? textareaCls(false) : VIEW_TEXTAREA_CLS}
                      {...register(`developmental_history.${key}` as const)}
                    />
                  </FieldWrapper>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* ════ Section 9: Medical History & Accommodations ════ */}
          <AccordionSection
            title="Medical History &amp; Accommodations"
            description="Psychiatric history, dietary restrictions, treatment records, and accommodation needs."
            isOpen={accordions.open.history}
            onToggle={() => accordions.toggle("history")}
            hasError={!!(errors.dietary_restrictions || errors.psychiatric_history || errors.treatment_history_details || errors.physical_accommodations || errors.general_accommodations)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldWrapper label="Dietary Restrictions" htmlFor="med-dietary_restrictions" error={errors.dietary_restrictions?.message}>
                  <textarea id="med-dietary_restrictions" placeholder="Dietary needs or restrictions (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.dietary_restrictions) : VIEW_TEXTAREA_CLS} {...register("dietary_restrictions")} />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper label="Psychiatric History" htmlFor="med-psychiatric_history" error={errors.psychiatric_history?.message}>
                  <textarea id="med-psychiatric_history" placeholder="Any psychiatric history, diagnoses, or treatment (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.psychiatric_history) : VIEW_TEXTAREA_CLS} {...register("psychiatric_history")} />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper label="Treatment History Details" htmlFor="med-treatment_history_details" error={errors.treatment_history_details?.message}>
                  <textarea id="med-treatment_history_details" placeholder="Ongoing or past treatments, therapies, or procedures (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.treatment_history_details) : VIEW_TEXTAREA_CLS} {...register("treatment_history_details")} />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper label="Physical Accommodations" htmlFor="med-physical_accommodations" error={errors.physical_accommodations?.message}>
                  <textarea id="med-physical_accommodations" placeholder="Physical accessibility needs or required accommodations (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.physical_accommodations) : VIEW_TEXTAREA_CLS} {...register("physical_accommodations")} />
                </FieldWrapper>
              </div>
              <div className="sm:col-span-2">
                <FieldWrapper label="General Accommodations" htmlFor="med-general_accommodations" error={errors.general_accommodations?.message}>
                  <textarea id="med-general_accommodations" placeholder="Any other accommodations or special requirements (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.general_accommodations) : VIEW_TEXTAREA_CLS} {...register("general_accommodations")} />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <CustomFieldsSection tab="medical" client={client} isEditable={isEditable} />
        </div>

        {/* ── Sticky footer ── */}
        {isEditable && (
          <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
            {isDirty ? (
              <p className="text-xs font-medium text-amber-600">You have unsaved changes.</p>
            ) : (
              <p className="text-xs text-slate-400">All changes are saved.</p>
            )}
            <button
              type="submit" disabled={submission.isSaving || !isDirty}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                submission.isSaving || !isDirty ? "cursor-not-allowed bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700",
              ].join(" ")}
            >
              {submission.isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
