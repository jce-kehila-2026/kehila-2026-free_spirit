"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ClientFormInput } from "@/schemas/clientSchema";
import {
  GENDER_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
} from "@/schemas/clientSchema";
import { AccordionSection } from "@/components/ui/AccordionSection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable label for enum values (title-case, underscores → spaces). */
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
 * Step 2 — Demographics
 *
 * Collects: passport_id, dob, address, gender, education_status,
 * diagnosis, personal_notes.
 *
 * Sections:
 *   1. "Identification" — open by default
 *   2. "Background Notes" — closed by default
 *
 * Auto-expands a section when it contains a validation error.
 */
export default function DemographicsStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientFormInput>();

  const [open, setOpen] = useState({ identification: true, notes: false });

  function toggle(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Auto-expand sections that contain validation errors
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        errors.passport_id ||
        errors.dob ||
        errors.gender ||
        errors.education_status ||
        errors.address
      ) {
        setOpen((prev) => ({ ...prev, identification: true }));
      }
      if (errors.diagnosis || errors.personal_notes) {
        setOpen((prev) => ({ ...prev, notes: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    errors.passport_id,
    errors.dob,
    errors.gender,
    errors.education_status,
    errors.address,
    errors.diagnosis,
    errors.personal_notes,
  ]);

  const identificationHasError = !!(
    errors.passport_id ||
    errors.dob ||
    errors.gender ||
    errors.education_status ||
    errors.address
  );

  const notesHasError = !!(errors.diagnosis || errors.personal_notes);

  return (
    <div className="space-y-3">
      {/* ── Section 1: Identification ── */}
      <AccordionSection
        title="Identification"
        description="Passport / ID, date of birth, address, and background details."
        isOpen={open.identification}
        onToggle={() => toggle("identification")}
        hasError={identificationHasError}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Passport / ID */}
          <FieldWrapper
            label="Passport / ID Number"
            htmlFor="passport_id"
            error={errors.passport_id?.message}
          >
            <input
              id="passport_id"
              type="text"
              placeholder="e.g. 123456789"
              className={inputCls(!!errors.passport_id)}
              {...register("passport_id")}
            />
          </FieldWrapper>

          {/* Date of Birth */}
          <FieldWrapper
            label="Date of Birth"
            htmlFor="dob"
            error={errors.dob?.message}
          >
            <input
              id="dob"
              type="date"
              className={inputCls(!!errors.dob)}
              {...register("dob")}
            />
          </FieldWrapper>

          {/* Gender */}
          <FieldWrapper
            label="Gender"
            htmlFor="gender"
            error={errors.gender?.message}
          >
            <select
              id="gender"
              className={selectCls(!!errors.gender)}
              {...register("gender")}
            >
              <option value="">Select gender…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {humanize(g)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Education Status */}
          <FieldWrapper
            label="Education Status"
            htmlFor="education_status"
            error={errors.education_status?.message}
          >
            <select
              id="education_status"
              className={selectCls(!!errors.education_status)}
              {...register("education_status")}
            >
              <option value="">Select education level…</option>
              {EDUCATION_STATUS_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {humanize(e)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Address — full width */}
          <div className="sm:col-span-2">
            <FieldWrapper
              label="Address"
              htmlFor="address"
              error={errors.address?.message}
            >
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                placeholder="e.g. 12 Ben Yehuda St, Tel Aviv"
                className={inputCls(!!errors.address)}
                {...register("address")}
              />
            </FieldWrapper>
          </div>
        </div>
      </AccordionSection>

      {/* ── Section 2: Background Notes ── */}
      <AccordionSection
        title="Background Notes"
        description="Diagnosis and personal notes (optional)."
        isOpen={open.notes}
        onToggle={() => toggle("notes")}
        hasError={notesHasError}
      >
        <div className="grid gap-5">
          {/* Diagnosis */}
          <FieldWrapper
            label="Diagnosis"
            htmlFor="diagnosis"
            error={errors.diagnosis?.message}
          >
            <textarea
              id="diagnosis"
              placeholder="Primary diagnosis or condition (optional)"
              className={textareaCls(!!errors.diagnosis)}
              {...register("diagnosis")}
            />
          </FieldWrapper>

          {/* Personal Notes */}
          <FieldWrapper
            label="Personal Notes"
            htmlFor="personal_notes"
            error={errors.personal_notes?.message}
          >
            <textarea
              id="personal_notes"
              placeholder="Any additional notes about the client (optional)"
              className={textareaCls(!!errors.personal_notes)}
              {...register("personal_notes")}
            />
          </FieldWrapper>
        </div>
      </AccordionSection>
    </div>
  );
}
