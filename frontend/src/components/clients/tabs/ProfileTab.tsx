"use client";

import type { FieldErrors } from "react-hook-form";
import type { Dependent } from "@/schema/supplementarySchema";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { GENDER_OPTIONS, EDUCATION_STATUS_OPTIONS } from "@/schema/constants";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Import our new Tier 2 Controller
import { useProfileTabController, EMPTY_DEPENDENT } from "./controllers/ProfileTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
  /** Called after a successful archive to navigate the user back to the client list. */
  onBack: () => void;
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

// ─── FieldWrapper (Pure UI Layout) ────────────────────────────────────────────

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

// ─── Component (Tier 1: Dumb View) ────────────────────────────────────────────

export default function ProfileTab({ client, isEditable }: ProfileTabProps) {
  // Wire up the controller
  const { form, dependents, accordions, submission } = useProfileTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Basic Information ════ */}
          <AccordionSection
            title="Basic Information"
            description="Core contact details required for all client records."
            isOpen={accordions.open.basic}
            onToggle={() => accordions.toggle('basic')}
            hasError={!!(errors.first_name || errors.last_name || errors.email || errors.phone)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="First Name" htmlFor="profile-first_name" error={errors.first_name?.message} required>
                <input
                  id="profile-first_name" type="text" autoComplete="given-name" placeholder="e.g. John"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.first_name) : VIEW_INPUT_CLS}
                  {...register("first_name")}
                />
              </FieldWrapper>

              <FieldWrapper label="Last Name" htmlFor="profile-last_name" error={errors.last_name?.message} required>
                <input
                  id="profile-last_name" type="text" autoComplete="family-name" placeholder="e.g. Doe"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.last_name) : VIEW_INPUT_CLS}
                  {...register("last_name")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                <FieldWrapper label="Email Address" htmlFor="profile-email" error={errors.email?.message} required>
                  <input
                    id="profile-email" type="email" autoComplete="email" placeholder="e.g. john.doe@gmail.com"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.email) : VIEW_INPUT_CLS}
                    {...register("email")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Phone Number" htmlFor="profile-phone" error={errors.phone?.message} required>
                  <input
                    id="profile-phone" type="tel" autoComplete="tel" placeholder="e.g. 050-1234567"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.phone) : VIEW_INPUT_CLS}
                    {...register("phone")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Demographics ════ */}
          <AccordionSection
            title="Demographics"
            description="Identification, address, and background details."
            isOpen={accordions.open.demographics}
            onToggle={() => accordions.toggle('demographics')}
            hasError={!!(
              errors.passport_id || errors.passport_number || errors.passport_country ||
              errors.citizenship || errors.dob || errors.gender || errors.education_status ||
              errors.referrer || errors.address || errors.home_address || errors.cohabitants ||
              errors.diagnosis || errors.personal_notes
            )}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Passport / ID Number" htmlFor="profile-passport_id" error={errors.passport_id?.message}>
                <input
                  id="profile-passport_id" type="text" placeholder="e.g. 123456789" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.passport_id) : VIEW_INPUT_CLS}
                  {...register("passport_id")}
                />
              </FieldWrapper>

              <FieldWrapper label="Passport Number" htmlFor="profile-passport_number" error={errors.passport_number?.message}>
                <input
                  id="profile-passport_number" type="text" placeholder="e.g. A12345678" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.passport_number) : VIEW_INPUT_CLS}
                  {...register("passport_number")}
                />
              </FieldWrapper>

              <FieldWrapper label="Passport Country" htmlFor="profile-passport_country" error={errors.passport_country?.message}>
                <input
                  id="profile-passport_country" type="text" placeholder="e.g. United States" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.passport_country) : VIEW_INPUT_CLS}
                  {...register("passport_country")}
                />
              </FieldWrapper>

              <FieldWrapper label="Citizenship" htmlFor="profile-citizenship" error={errors.citizenship?.message}>
                <input
                  id="profile-citizenship" type="text" placeholder="e.g. American" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.citizenship) : VIEW_INPUT_CLS}
                  {...register("citizenship")}
                />
              </FieldWrapper>

              <FieldWrapper label="Date of Birth" htmlFor="profile-dob" error={errors.dob?.message}>
                <input
                  id="profile-dob" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.dob) : VIEW_INPUT_CLS}
                  {...register("dob")}
                />
              </FieldWrapper>

              <FieldWrapper label="Gender" htmlFor="profile-gender" error={errors.gender?.message}>
                <select
                  id="profile-gender" disabled={!isEditable}
                  className={isEditable ? selectCls(!!errors.gender) : VIEW_SELECT_CLS}
                  {...register("gender")}
                >
                  <option value="">Select gender…</option>
                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{humanize(g)}</option>)}
                </select>
              </FieldWrapper>

              <FieldWrapper label="Education Status" htmlFor="profile-education_status" error={errors.education_status?.message}>
                <select
                  id="profile-education_status" disabled={!isEditable}
                  className={isEditable ? selectCls(!!errors.education_status) : VIEW_SELECT_CLS}
                  {...register("education_status")}
                >
                  <option value="">Select education level…</option>
                  {EDUCATION_STATUS_OPTIONS.map((e) => <option key={e} value={e}>{humanize(e)}</option>)}
                </select>
              </FieldWrapper>

              <FieldWrapper label="Referred By" htmlFor="profile-referrer" error={errors.referrer?.message}>
                <input
                  id="profile-referrer" type="text" placeholder="e.g. Social worker..." readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.referrer) : VIEW_INPUT_CLS}
                  {...register("referrer")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                <FieldWrapper label="Local Address" htmlFor="profile-address" error={errors.address?.message}>
                  <input
                    id="profile-address" type="text" autoComplete="street-address" placeholder="e.g. 12 Ben Yehuda St"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.address) : VIEW_INPUT_CLS}
                    {...register("address")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Home Address (Permanent)" htmlFor="profile-home_address" error={errors.home_address?.message}>
                  <input
                    id="profile-home_address" type="text" placeholder="e.g. 123 Main St" readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.home_address) : VIEW_INPUT_CLS}
                    {...register("home_address")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Cohabitants" htmlFor="profile-cohabitants" error={errors.cohabitants?.message}>
                  <textarea
                    id="profile-cohabitants" placeholder="List names and relationships..." readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.cohabitants) : VIEW_TEXTAREA_CLS}
                    {...register("cohabitants")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Diagnosis" htmlFor="profile-diagnosis" error={errors.diagnosis?.message}>
                  <textarea
                    id="profile-diagnosis" placeholder="Primary diagnosis..." readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.diagnosis) : VIEW_TEXTAREA_CLS}
                    {...register("diagnosis")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Personal Notes" htmlFor="profile-personal_notes" error={errors.personal_notes?.message}>
                  <textarea
                    id="profile-personal_notes" placeholder="Any additional notes..." readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.personal_notes) : VIEW_TEXTAREA_CLS}
                    {...register("personal_notes")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 3: Dependents ════ */}
          <AccordionSection
            title="Dependents"
            description="Immediate family members or other dependents of the client."
            isOpen={accordions.open.dependents}
            onToggle={() => accordions.toggle('dependents')}
            hasError={!!errors.dependents}
          >
            {isEditable && (
              <div className="mb-5">
                <button
                  type="button" id="btn-dependents-add"
                  onClick={() => dependents.append(EMPTY_DEPENDENT)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add Dependent
                </button>
              </div>
            )}

            {dependents.fields.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  No dependents added yet.
                  {isEditable && <><br />Click <strong className="text-slate-600">&quot;+ Add Dependent&quot;</strong> above.</>}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {dependents.fields.map((field, index) => {
                const dependentErrors = errors.dependents as FieldErrors<Dependent>[];
                const de = dependentErrors?.[index];

                return (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">Dependent #{index + 1}</h3>
                      {isEditable && (
                        <button
                          type="button" id={`btn-dependents-remove-${index}`}
                          onClick={() => dependents.remove(index)}
                          className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FieldWrapper label="Name" htmlFor={`dp-name-${index}`} error={de?.name?.message}>
                        <input
                          id={`dp-name-${index}`} type="text" placeholder="e.g. Jane Doe" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!de?.name) : VIEW_INPUT_CLS}
                          {...register(`dependents.${index}.name` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Relationship" htmlFor={`dp-relationship-${index}`} error={de?.relationship?.message}>
                        <input
                          id={`dp-relationship-${index}`} type="text" placeholder="e.g. Daughter" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!de?.relationship) : VIEW_INPUT_CLS}
                          {...register(`dependents.${index}.relationship` as const)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Date of Birth" htmlFor={`dp-dob-${index}`} error={de?.dob?.message}>
                        <input
                          id={`dp-dob-${index}`} type="date" readOnly={!isEditable}
                          className={isEditable ? inputCls(!!de?.dob) : VIEW_INPUT_CLS}
                          {...register(`dependents.${index}.dob` as const)}
                        />
                      </FieldWrapper>
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
              type="submit" id="btn-profile-save" disabled={submission.isSaving || !isDirty}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                submission.isSaving || !isDirty ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700",
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