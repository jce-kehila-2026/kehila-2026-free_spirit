"use client";

import { useFormContext } from "react-hook-form";
import type { ClientFormInput } from "@/schema/clientSchema";

// ─── Reusable field wrapper ───────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  required = false,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
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
 * Basic Information section — collects name, email, and phone.
 *
 * All fields are optional; the intake form permits saving with partial data.
 * No action buttons live here — the single "Save as Interested" button is
 * rendered by the parent ClientIntakeForm.
 */
export default function BasicInfoStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientFormInput>();

  return (
    <div>
      {/* ── Fields grid ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* First name */}
        <FieldWrapper
          label="First Name"
          htmlFor="first_name"
          required
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
          required
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
            required
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
            required
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
    </div>
  );
}
