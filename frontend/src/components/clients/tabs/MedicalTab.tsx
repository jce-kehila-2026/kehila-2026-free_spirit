"use client";

import { AccordionSection } from "@/components/ui/AccordionSection";
import type { FieldErrors } from "react-hook-form";
import { MEDICAL_CLEARANCE_STATUS } from "@/schema/constants";
import type { HealthcareProvider, Vaccination, Hospitalization } from "@/schema/medicalSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Import our Tier 2 Controller
import { 
  useMedicalTabController, 
  EMPTY_PROVIDER, 
  EMPTY_VACCINATION, 
  EMPTY_HOSPITALIZATION 
} from "./controllers/MedicalTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  client: ClientDoc;
  isEditable: boolean;
}

// ─── Shared styling helpers (Pure UI) ─────────────────────────────────────────

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
const VIEW_SELECT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none appearance-none";
const VIEW_TEXTAREA_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function MedicalTab({ client, isEditable }: MedicalTabProps) {
  // Wire up the controller
  const { form, accordions, conditionsList, arrays, viewFlags, mp, submission } = useMedicalTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Insurance & Clearance ════ */}
          <AccordionSection
            title="Insurance & Clearance"
            description="Health insurance details and program medical clearance status."
            isOpen={accordions.open.insurance}
            onToggle={() => accordions.toggle("insurance")}
            hasError={!!(errors.insurance_company || errors.policy_number || errors.medical_clearance_status)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Insurance Company" htmlFor="med-insurance_company" error={errors.insurance_company?.message}>
                <input
                  id="med-insurance_company" type="text" placeholder="e.g. Harel, Phoenix, Menora" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.insurance_company) : VIEW_INPUT_CLS}
                  {...register("insurance_company")}
                />
              </FieldWrapper>

              <FieldWrapper label="Policy Number" htmlFor="med-policy_number" error={errors.policy_number?.message}>
                <input
                  id="med-policy_number" type="text" placeholder="e.g. POL-12345" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.policy_number) : VIEW_INPUT_CLS}
                  {...register("policy_number")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                <FieldWrapper label="Medical Clearance Status" htmlFor="med-medical_clearance_status" error={errors.medical_clearance_status?.message}>
                  <select
                    id="med-medical_clearance_status" disabled={!isEditable}
                    className={isEditable ? selectCls(!!errors.medical_clearance_status) : VIEW_SELECT_CLS}
                    {...register("medical_clearance_status")}
                  >
                    <option value="">Select clearance status…</option>
                    {MEDICAL_CLEARANCE_STATUS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </select>
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Physical Vitals ════ */}
          <AccordionSection
            title="Physical Vitals"
            description="Physical measurements recorded at intake."
            isOpen={accordions.open.vitals}
            onToggle={() => accordions.toggle("vitals")}
            hasError={!!(errors.physical_height || errors.physical_weight || errors.physical_blood_pressure || errors.physical_pulse_rate || errors.pulse_irregularities)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Height" htmlFor="med-physical_height" error={errors.physical_height?.message}>
                <input
                  id="med-physical_height" type="text" placeholder='e.g. 5&apos;10" or 178 cm' readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_height) : VIEW_INPUT_CLS}
                  {...register("physical_height")}
                />
              </FieldWrapper>

              <FieldWrapper label="Weight" htmlFor="med-physical_weight" error={errors.physical_weight?.message}>
                <input
                  id="med-physical_weight" type="text" placeholder="e.g. 72 kg or 158 lbs" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_weight) : VIEW_INPUT_CLS}
                  {...register("physical_weight")}
                />
              </FieldWrapper>

              <FieldWrapper label="Blood Pressure" htmlFor="med-physical_blood_pressure" error={errors.physical_blood_pressure?.message}>
                <input
                  id="med-physical_blood_pressure" type="text" placeholder="e.g. 120/80 mmHg" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_blood_pressure) : VIEW_INPUT_CLS}
                  {...register("physical_blood_pressure")}
                />
              </FieldWrapper>

              <FieldWrapper label="Pulse Rate" htmlFor="med-physical_pulse_rate" error={errors.physical_pulse_rate?.message}>
                <input
                  id="med-physical_pulse_rate" type="text" placeholder="e.g. 72 bpm" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.physical_pulse_rate) : VIEW_INPUT_CLS}
                  {...register("physical_pulse_rate")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                {isEditable ? (
                  <label htmlFor="med-pulse_irregularities" className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50">
                    <input id="med-pulse_irregularities" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" {...register("pulse_irregularities")} />
                    <span className="text-sm font-medium text-slate-700">Pulse Irregularities Noted</span>
                  </label>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-700">Pulse Irregularities</span>
                    <BooleanBadge value={viewFlags.wPulseIrregularities} />
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 3: Healthcare Providers ════ */}
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
                const providerErrors = errors.healthcare_providers as FieldErrors<HealthcareProvider>[];
                const pe = providerErrors?.[index];

                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Provider #{index + 1}</h3>
                      {isEditable && (
                        <button
                          type="button" onClick={() => arrays.providers.remove(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Name" htmlFor={`pv-name-${index}`} error={pe?.name?.message}>
                        <input
                          id={`pv-name-${index}`} type="text" placeholder="e.g. Dr. Sarah Cohen" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.name) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.name` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Specialty" htmlFor={`pv-specialty-${index}`} error={pe?.specialty?.message}>
                        <input
                          id={`pv-specialty-${index}`} type="text" placeholder="e.g. Cardiologist, GP" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.specialty) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.specialty` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Phone" htmlFor={`pv-phone-${index}`} error={pe?.phone?.message}>
                        <input
                          id={`pv-phone-${index}`} type="tel" placeholder="e.g. 03-1234567" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.phone) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.phone` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Email" htmlFor={`pv-email-${index}`} error={pe?.email?.message}>
                        <input
                          id={`pv-email-${index}`} type="email" placeholder="e.g. dr.cohen@clinic.com" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.email) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.email` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Facility / Clinic" htmlFor={`pv-facility-${index}`} error={pe?.facility?.message}>
                        <input
                          id={`pv-facility-${index}`} type="text" placeholder="e.g. Ichilov Medical Center" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.facility) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.facility` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Last Appointment" htmlFor={`pv-last_appt-${index}`} error={pe?.last_appt?.message}>
                        <input
                          id={`pv-last_appt-${index}`} type="date" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!pe?.last_appt) : VIEW_INPUT_CLS}
                          {...register(`healthcare_providers.${index}.last_appt` as const)}
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
            isOpen={accordions.open.screening}
            onToggle={() => accordions.toggle("screening")}
            hasError={!!(errors.uses_narcotics_alcohol || errors.pending_medical_exams || errors.trip_for_medical_care || errors.pending_surgery || errors.recent_hospitalizations || errors.medical_air_transport_rider || errors.alcohol_glasses_per_day || errors.seasickness_meds_pref)}
          >
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: "med-uses_narcotics_alcohol", watchedValue: viewFlags.wUsesNarcotics, name: "uses_narcotics_alcohol" as const, label: "Uses Narcotics / Alcohol" },
                    { id: "med-pending_medical_exams", watchedValue: viewFlags.wPendingExams, name: "pending_medical_exams" as const, label: "Pending Medical Exams" },
                    { id: "med-trip_for_medical_care", watchedValue: viewFlags.wTripMedical, name: "trip_for_medical_care" as const, label: "Trip Taken for Medical Care" },
                    { id: "med-pending_surgery", watchedValue: viewFlags.wPendingSurgery, name: "pending_surgery" as const, label: "Pending Surgery" },
                    { id: "med-recent_hospitalizations", watchedValue: viewFlags.wRecentHosp, name: "recent_hospitalizations" as const, label: "Recent Hospitalizations" },
                    { id: "med-medical_air_transport_rider", watchedValue: viewFlags.wAirTransport, name: "medical_air_transport_rider" as const, label: "Medical Air Transport Rider" },
                  ]
                ).map(({ id, name, label, watchedValue }) =>
                  isEditable ? (
                    <label key={id} htmlFor={id} className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50">
                      <input id={id} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" {...register(name)} />
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                    </label>
                  ) : (
                    <div key={id} className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-slate-700">{label}</span>
                      <BooleanBadge value={watchedValue} />
                    </div>
                  )
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldWrapper label="Alcoholic Drinks per Day" htmlFor="med-alcohol_glasses_per_day" error={errors.alcohol_glasses_per_day?.message}>
                  <input
                    id="med-alcohol_glasses_per_day" type="text" placeholder="e.g. 0, 1–2, 3+" readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.alcohol_glasses_per_day) : VIEW_INPUT_CLS}
                    {...register("alcohol_glasses_per_day")}
                  />
                </FieldWrapper>

                <FieldWrapper label="Seasickness Medication Preference" htmlFor="med-seasickness_meds_pref" error={errors.seasickness_meds_pref?.message}>
                  <input
                    id="med-seasickness_meds_pref" type="text" placeholder="e.g. Dramamine, patch, none" readOnly={!isEditable}
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
            isOpen={accordions.open.conditions}
            onToggle={() => accordions.toggle("conditions")}
            hasError={!!errors.medical_conditions_checklist}
          >
            {isEditable && (
              <div className="mb-4 flex gap-3">
                <input
                  id="med-condition-input" type="text" placeholder="Type a condition and press Enter or click Add…"
                  value={conditionsList.conditionInput}
                  onChange={(e) => conditionsList.setConditionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); conditionsList.addCondition(); } }}
                  className={inputCls(false) + " flex-1"}
                />
                <button
                  type="button" onClick={conditionsList.addCondition}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add
                </button>
              </div>
            )}

            {conditionsList.conditions.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                <p className="text-sm text-slate-400">
                  {isEditable ? 'No conditions listed. Type one above and click "+ Add".' : "No medical conditions recorded."}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {conditionsList.conditions.map((condition, index) => (
                  <span key={index} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-medium text-blue-800 ring-1 ring-blue-200">
                    {condition}
                    {isEditable && (
                      <button
                        type="button" onClick={() => conditionsList.removeCondition(index)}
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
            isOpen={accordions.open.history}
            onToggle={() => accordions.toggle("history")}
            hasError={!!(errors.allergies || errors.medications || errors.dietary_restrictions || errors.psychiatric_history || errors.developmental_history || errors.treatment_history_details || errors.physical_accommodations || errors.general_accommodations)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldWrapper label="Allergies" htmlFor="med-allergies" error={errors.allergies?.message}>
                  <textarea id="med-allergies" placeholder="List any known allergies (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.allergies) : VIEW_TEXTAREA_CLS} {...register("allergies")} />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Current Medications" htmlFor="med-medications" error={errors.medications?.message}>
                  <textarea id="med-medications" placeholder="Current medications and dosages (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.medications) : VIEW_TEXTAREA_CLS} {...register("medications")} />
                </FieldWrapper>
              </div>

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
                <FieldWrapper label="Developmental History" htmlFor="med-developmental_history" error={errors.developmental_history?.message}>
                  <textarea id="med-developmental_history" placeholder="Developmental milestones, delays, or special needs (optional)" readOnly={!isEditable} className={isEditable ? textareaCls(!!errors.developmental_history) : VIEW_TEXTAREA_CLS} {...register("developmental_history")} />
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

          {/* ════ Section 7: Vaccination History ════ */}
          <AccordionSection
            title="Vaccination History"
            description="Immunizations received, pending, or declined."
            isOpen={accordions.open.vaccinations}
            onToggle={() => accordions.toggle("vaccinations")}
            hasError={!!errors.vaccination_history}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button" onClick={() => arrays.vaccinations.append(EMPTY_VACCINATION)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Vaccination
                </button>
              </div>
            )}

            {arrays.vaccinations.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No vaccination records added yet.
                  {isEditable && <> Click <strong className="text-slate-600">&quot;+ Add Vaccination&quot;</strong> to add one.</>}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {arrays.vaccinations.fields.map((field, index) => {
                const vaccinationErrors = errors.vaccination_history as FieldErrors<Vaccination>[];
                const ve = vaccinationErrors?.[index];
                const isReceived = arrays.vaccinations.fields[index] ? (mp.vaccination_history?.[index]?.received ?? false) : false;

                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Vaccination #{index + 1}</h3>
                      {isEditable && (
                        <button
                          type="button" onClick={() => arrays.vaccinations.remove(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FieldWrapper label="Vaccine Type" htmlFor={`vx-type-${index}`} error={ve?.type?.message}>
                        <input
                          id={`vx-type-${index}`} type="text" placeholder="e.g. COVID-19, Flu, MMR" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!ve?.type) : VIEW_INPUT_CLS}
                          {...register(`vaccination_history.${index}.type` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Date Administered" htmlFor={`vx-date-${index}`} error={ve?.date?.message}>
                        <input
                          id={`vx-date-${index}`} type="date" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!ve?.date) : VIEW_INPUT_CLS}
                          {...register(`vaccination_history.${index}.date` as const)}
                        />
                      </FieldWrapper>

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-700">Status</span>
                        {isEditable ? (
                          <label htmlFor={`vx-received-${index}`} className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50">
                            <input
                              id={`vx-received-${index}`} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              {...register(`vaccination_history.${index}.received` as const)}
                            />
                            <span className="text-sm font-medium text-slate-700">Received</span>
                          </label>
                        ) : (
                          <BooleanBadge value={isReceived} trueLabel="Received" falseLabel="Not received" />
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
            isOpen={accordions.open.hospitalizations}
            onToggle={() => accordions.toggle("hospitalizations")}
            hasError={!!errors.hospitalization_history}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button" onClick={() => arrays.hospitalizations.append(EMPTY_HOSPITALIZATION)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Event
                </button>
              </div>
            )}

            {arrays.hospitalizations.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No hospitalization records added yet.
                  {isEditable && <> Click <strong className="text-slate-600">&quot;+ Add Event&quot;</strong> to add one.</>}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {arrays.hospitalizations.fields.map((field, index) => {
                const hospitalizationErrors = errors.hospitalization_history as FieldErrors<Hospitalization>[];
                const he = hospitalizationErrors?.[index];

                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Event #{index + 1}</h3>
                      {isEditable && (
                        <button
                          type="button" onClick={() => arrays.hospitalizations.remove(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldWrapper label="Type / Reason" htmlFor={`hz-type-${index}`} error={he?.type?.message}>
                        <input
                          id={`hz-type-${index}`} type="text" placeholder="e.g. Appendectomy, Cardiac Procedure" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!he?.type) : VIEW_INPUT_CLS}
                          {...register(`hospitalization_history.${index}.type` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Date" htmlFor={`hz-date-${index}`} error={he?.date?.message}>
                        <input
                          id={`hz-date-${index}`} type="date" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!he?.date) : VIEW_INPUT_CLS}
                          {...register(`hospitalization_history.${index}.date` as const)}
                        />
                      </FieldWrapper>

                      <div className="sm:col-span-2">
                        <FieldWrapper label="Description" htmlFor={`hz-description-${index}`} error={he?.description?.message}>
                          <textarea
                            id={`hz-description-${index}`} placeholder="Brief description of the hospitalization or medical event" readOnly={!isEditable}
                            className={isEditable ? textareaCls(!!he?.description) : VIEW_TEXTAREA_CLS}
                            {...register(`hospitalization_history.${index}.description` as const)}
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