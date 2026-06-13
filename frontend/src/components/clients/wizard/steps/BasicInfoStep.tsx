"use client";

import { useFormContext } from "react-hook-form";
import type { ClientFormInput } from "@/schema/clientSchema";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BasicInfoStepProps {
  /** Called when the user clicks "Save as Interested". */
  onSaveAsInterested: () => Promise<void>;
  /** Called when the user clicks "Continue Registration". */
  onContinueRegistration: () => Promise<void>;
}

// ─── Reusable field wrapper ───────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-slate-700"
      >
        {label}
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
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

// ─── Shared input class builder ───────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Step 1 — Basic Information
 *
 * Collects the four fields that are mandatory for ALL client statuses:
 *   first_name, last_name, email, phone.
 *
 * Presents two branching CTAs so the Manager can choose the client's path
 * without changing a separate status dropdown.
 */
export default function BasicInfoStep({
  onSaveAsInterested,
  onContinueRegistration,
}: BasicInfoStepProps) {
  const {
    register,
    formState: { errors, isSubmitting },
  } = useFormContext<ClientFormInput>();

  return (
    <div>
      {/* ── Section heading ── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">
          Basic Information
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          These four fields are required for all records.
        </p>
      </div>

      {/* ── Fields grid ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* First name */}
        <FieldWrapper
          label="First Name"
          htmlFor="first_name"
          error={errors.first_name?.message}
        >
          <input
            id="first_name"
            type="text"
            autoComplete="given-name"
            placeholder="e.g. John"
            className={inputCls(!!errors.first_name)}
            {...register("first_name")}
          />
        </FieldWrapper>

        {/* Last name */}
        <FieldWrapper
          label="Last Name"
          htmlFor="last_name"
          error={errors.last_name?.message}
        >
          <input
            id="last_name"
            type="text"
            autoComplete="family-name"
            placeholder="e.g. Doe"
            className={inputCls(!!errors.last_name)}
            {...register("last_name")}
          />
        </FieldWrapper>

        {/* Email — full width */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Email Address"
            htmlFor="email"
            error={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. john.doe@gmail.com"
              className={inputCls(!!errors.email)}
              {...register("email")}
            />
          </FieldWrapper>
        </div>

        {/* Phone — full width */}
        <div className="sm:col-span-2">
          <FieldWrapper
            label="Phone Number"
            htmlFor="phone"
            error={errors.phone?.message}
          >
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 050-1234567"
              className={inputCls(!!errors.phone)}
              {...register("phone")}
            />
          </FieldWrapper>
        </div>
      </div>

      {/* ── Divider ── */}
      <hr className="my-7 border-slate-100" />

      {/* ── Branching CTAs ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {/* Option A: partial save */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            id="btn-save-interested"
            disabled={isSubmitting}
            onClick={onSaveAsInterested}
            className={[
              "rounded-lg border border-slate-300 bg-white px-5 py-2.5",
              "text-sm font-semibold text-slate-700 shadow-sm",
              "transition-colors hover:bg-slate-50 hover:border-slate-400",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            💾 Save as Interested
          </button>
          <p className="text-xs text-slate-400 sm:text-center">
            Saves a partial contact record
          </p>
        </div>

        {/* Option B: full registration */}
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            id="btn-continue-registration"
            disabled={isSubmitting}
            onClick={onContinueRegistration}
            className={[
              "rounded-lg bg-indigo-600 px-6 py-2.5",
              "text-sm font-semibold text-white shadow-sm",
              "transition-colors hover:bg-indigo-700",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            Continue Registration →
          </button>
          <p className="text-xs text-slate-400">
            Proceed to full registration (Steps 2–4)
          </p>
        </div>
      </div>
    </div>
  );
}
