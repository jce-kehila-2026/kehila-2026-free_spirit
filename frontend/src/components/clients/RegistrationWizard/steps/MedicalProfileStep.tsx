"use client";

import { useFormContext } from "react-hook-form";
import type { ClientFormInput } from "@/schemas/clientSchema";
import { MEDICAL_CLEARANCE_STATUS } from "@/schemas/clientSchema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Step 3 — Medical Profile
 *
 * All fields use dotted `register('medical_profile.xyz')` notation
 * so react-hook-form writes to the correct nested path.
 *
 * physician_name and physician_phone are required for registered clients
 * (enforced by superRefine in the schema).
 */
export default function MedicalProfileStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientFormInput>();

  // Shorthand for nested errors
  const mp = errors.medical_profile;

  return (
    <div>
      {/* ── Section heading ── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">Medical Profile</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Primary physician, insurance, and health information.
        </p>
      </div>

      {/* ── Fields grid ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Physician Name */}
        <FieldWrapper
          label="Physician Name"
          htmlFor="mp_physician_name"
          error={mp?.physician_name?.message}
        >
          <input
            id="mp_physician_name"
            type="text"
            placeholder="e.g. Dr. David Levi"
            className={inputCls(!!mp?.physician_name)}
            {...register("medical_profile.physician_name")}
          />
        </FieldWrapper>

        {/* Physician Phone */}
        <FieldWrapper
          label="Physician Phone"
          htmlFor="mp_physician_phone"
          error={mp?.physician_phone?.message}
        >
          <input
            id="mp_physician_phone"
            type="tel"
            placeholder="e.g. 03-1234567"
            className={inputCls(!!mp?.physician_phone)}
            {...register("medical_profile.physician_phone")}
          />
        </FieldWrapper>

        {/* Insurance Company */}
        <FieldWrapper
          label="Insurance Company"
          htmlFor="mp_insurance_company"
          error={mp?.insurance_company?.message}
        >
          <input
            id="mp_insurance_company"
            type="text"
            placeholder="e.g. Clalit, Maccabi"
            className={inputCls(!!mp?.insurance_company)}
            {...register("medical_profile.insurance_company")}
          />
        </FieldWrapper>

        {/* Policy Number */}
        <FieldWrapper
          label="Policy Number"
          htmlFor="mp_policy_number"
          error={mp?.policy_number?.message}
        >
          <input
            id="mp_policy_number"
            type="text"
            placeholder="e.g. POL-12345"
            className={inputCls(!!mp?.policy_number)}
            {...register("medical_profile.policy_number")}
          />
        </FieldWrapper>

        {/* Medical Clearance Status */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Medical Clearance Status"
            htmlFor="mp_medical_clearance_status"
            error={mp?.medical_clearance_status?.message}
          >
            <select
              id="mp_medical_clearance_status"
              className={selectCls(!!mp?.medical_clearance_status)}
              defaultValue=""
              {...register("medical_profile.medical_clearance_status")}
            >
              <option value="" disabled>
                Select clearance status…
              </option>
              {MEDICAL_CLEARANCE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* Allergies — full width */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Allergies"
            htmlFor="mp_allergies"
            error={mp?.allergies?.message}
          >
            <textarea
              id="mp_allergies"
              placeholder="List any known allergies (optional)"
              className={textareaCls(!!mp?.allergies)}
              {...register("medical_profile.allergies")}
            />
          </FieldWrapper>
        </div>

        {/* Medications — full width */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Medications"
            htmlFor="mp_medications"
            error={mp?.medications?.message}
          >
            <textarea
              id="mp_medications"
              placeholder="Current medications and dosages (optional)"
              className={textareaCls(!!mp?.medications)}
              {...register("medical_profile.medications")}
            />
          </FieldWrapper>
        </div>

        {/* Dietary Restrictions — full width */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Dietary Restrictions"
            htmlFor="mp_dietary_restrictions"
            error={mp?.dietary_restrictions?.message}
          >
            <textarea
              id="mp_dietary_restrictions"
              placeholder="Dietary needs or restrictions (optional)"
              className={textareaCls(!!mp?.dietary_restrictions)}
              {...register("medical_profile.dietary_restrictions")}
            />
          </FieldWrapper>
        </div>
      </div>
    </div>
  );
}
