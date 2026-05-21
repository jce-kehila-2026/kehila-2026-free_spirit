"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  basicInfoSchema,
  GENDER_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
  type BasicInfoFormData,
} from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
}

// ─── Shared styling helpers ───────────────────────────────────────────────────

// Edit-mode classes (interactive borders, focus rings)
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

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      )}
    </div>
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
 * ProfileTab
 *
 * Tab 1 of ClientProfileDashboard — combines the Basic Info and Demographics
 * fields from the registration wizard into a single, scrollable edit form.
 *
 * Owns its own react-hook-form instance (pre-filled from the client prop)
 * and writes directly to Firestore on "Save Changes".
 */
export default function ProfileTab({ client, isEditable }: ProfileTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: "onTouched",
    defaultValues: {
      first_name: client.first_name ?? "",
      last_name: client.last_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      status: client.status ?? "draft",
      passport_id: client.passport_id ?? "",
      gender: client.gender ?? undefined,
      address: client.address ?? "",
      dob: client.dob ?? "",
      referrer: client.referrer ?? "",
      education_status: client.education_status ?? undefined,
      program_ids: client.program_ids ?? [],
      diagnosis: client.diagnosis ?? "",
      personal_notes: client.personal_notes ?? "",
    },
  });

  // ── Save handler ──────────────────────────────────────────────────────────

  async function onSubmit(data: BasicInfoFormData) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        ...sanitize(data as Record<string, unknown>),
        updated_at: serverTimestamp(),
      });
      toast.success("Profile saved successfully.");
    } catch (err) {
      console.error("[ProfileTab] Firestore update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* ── Scrollable body ── */}
        <div className="space-y-10 p-6 sm:p-8">

          {/* ════ Section 1: Basic Information ════ */}
          <section>
            <SectionHeading
              title="Basic Information"
              description="Core contact details required for all client records."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {/* First Name */}
              <FieldWrapper
                label="First Name"
                htmlFor="profile-first_name"
                error={errors.first_name?.message}
                required
              >
                <input
                  id="profile-first_name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="e.g. John"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.first_name) : VIEW_INPUT_CLS}
                  {...register("first_name")}
                />
              </FieldWrapper>

              {/* Last Name */}
              <FieldWrapper
                label="Last Name"
                htmlFor="profile-last_name"
                error={errors.last_name?.message}
                required
              >
                <input
                  id="profile-last_name"
                  type="text"
                  autoComplete="family-name"
                  placeholder="e.g. Doe"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.last_name) : VIEW_INPUT_CLS}
                  {...register("last_name")}
                />
              </FieldWrapper>

              {/* Email — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Email Address"
                  htmlFor="profile-email"
                  error={errors.email?.message}
                  required
                >
                  <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    placeholder="e.g. john.doe@gmail.com"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.email) : VIEW_INPUT_CLS}
                    {...register("email")}
                  />
                </FieldWrapper>
              </div>

              {/* Phone — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Phone Number"
                  htmlFor="profile-phone"
                  error={errors.phone?.message}
                  required
                >
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. 050-1234567"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.phone) : VIEW_INPUT_CLS}
                    {...register("phone")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </section>

          {/* Divider */}
          <hr className="border-slate-100" />

          {/* ════ Section 2: Demographics ════ */}
          <section>
            <SectionHeading
              title="Demographics"
              description="Identification, address, and background details."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Passport / ID */}
              <FieldWrapper
                label="Passport / ID Number"
                htmlFor="profile-passport_id"
                error={errors.passport_id?.message}
              >
                <input
                  id="profile-passport_id"
                  type="text"
                  placeholder="e.g. 123456789"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.passport_id) : VIEW_INPUT_CLS}
                  {...register("passport_id")}
                />
              </FieldWrapper>

              {/* Date of Birth */}
              <FieldWrapper
                label="Date of Birth"
                htmlFor="profile-dob"
                error={errors.dob?.message}
              >
                <input
                  id="profile-dob"
                  type="date"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.dob) : VIEW_INPUT_CLS}
                  {...register("dob")}
                />
              </FieldWrapper>

              {/* Gender */}
              <FieldWrapper
                label="Gender"
                htmlFor="profile-gender"
                error={errors.gender?.message}
              >
                <select
                  id="profile-gender"
                  disabled={!isEditable}
                  className={isEditable ? selectCls(!!errors.gender) : VIEW_SELECT_CLS}
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
                htmlFor="profile-education_status"
                error={errors.education_status?.message}
              >
                <select
                  id="profile-education_status"
                  disabled={!isEditable}
                  className={isEditable ? selectCls(!!errors.education_status) : VIEW_SELECT_CLS}
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
                  htmlFor="profile-address"
                  error={errors.address?.message}
                >
                  <input
                    id="profile-address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="e.g. 12 Ben Yehuda St, Tel Aviv"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.address) : VIEW_INPUT_CLS}
                    {...register("address")}
                  />
                </FieldWrapper>
              </div>

              {/* Referrer — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Referred By"
                  htmlFor="profile-referrer"
                  error={errors.referrer?.message}
                >
                  <input
                    id="profile-referrer"
                    type="text"
                    placeholder="e.g. Social worker, community center…"
                    readOnly={!isEditable}
                    className={isEditable ? inputCls(!!errors.referrer) : VIEW_INPUT_CLS}
                    {...register("referrer")}
                  />
                </FieldWrapper>
              </div>

              {/* Diagnosis — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Diagnosis"
                  htmlFor="profile-diagnosis"
                  error={errors.diagnosis?.message}
                >
                  <textarea
                    id="profile-diagnosis"
                    placeholder="Primary diagnosis or condition (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.diagnosis) : VIEW_TEXTAREA_CLS}
                    {...register("diagnosis")}
                  />
                </FieldWrapper>
              </div>

              {/* Personal Notes — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Personal Notes"
                  htmlFor="profile-personal_notes"
                  error={errors.personal_notes?.message}
                >
                  <textarea
                    id="profile-personal_notes"
                    placeholder="Any additional notes about the client (optional)"
                    readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.personal_notes) : VIEW_TEXTAREA_CLS}
                    {...register("personal_notes")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </section>
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
              id="btn-profile-save"
              disabled={isSaving || !isDirty}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                isSaving || !isDirty
                  ? "bg-indigo-300 cursor-not-allowed"
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
