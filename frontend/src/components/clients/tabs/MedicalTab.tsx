"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  medicalProfileSchema,
  MEDICAL_CLEARANCE_STATUS,
  type MedicalProfile,
} from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  client: ClientDoc;
}

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
 * Tab 2 of ClientProfileDashboard — renders all medical_profile fields
 * extracted from MedicalProfileStep.tsx into a standalone edit form.
 *
 * Owns its own react-hook-form instance (pre-filled from client.medical_profile)
 * and writes to the Firestore `medical_profile` nested field on "Save Changes".
 */
export default function MedicalTab({ client }: MedicalTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const mp = client.medical_profile ?? {};

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MedicalProfile>({
    resolver: zodResolver(medicalProfileSchema),
    mode: "onTouched",
    defaultValues: {
      physician_name:           mp.physician_name           ?? "",
      physician_phone:          mp.physician_phone          ?? "",
      insurance_company:        mp.insurance_company        ?? "",
      policy_number:            mp.policy_number            ?? "",
      medical_clearance_status: mp.medical_clearance_status ?? undefined,
      allergies:                mp.allergies                ?? "",
      medications:              mp.medications              ?? "",
      dietary_restrictions:     mp.dietary_restrictions     ?? "",
    },
  });

  // ── Save handler ──────────────────────────────────────────────────────────

  async function onSubmit(data: MedicalProfile) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        // Write the entire nested object under the `medical_profile` key so
        // Firestore merges it correctly without touching other top-level fields.
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* ── Scrollable body ── */}
        <div className="p-6 sm:p-8">
          {/* Section heading */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-800">Medical Profile</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Primary physician, insurance, and health information.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Physician Name */}
            <FieldWrapper
              label="Physician Name"
              htmlFor="med-physician_name"
              error={errors.physician_name?.message}
            >
              <input
                id="med-physician_name"
                type="text"
                placeholder="e.g. Dr. David Levi"
                className={inputCls(!!errors.physician_name)}
                {...register("physician_name")}
              />
            </FieldWrapper>

            {/* Physician Phone */}
            <FieldWrapper
              label="Physician Phone"
              htmlFor="med-physician_phone"
              error={errors.physician_phone?.message}
            >
              <input
                id="med-physician_phone"
                type="tel"
                placeholder="e.g. 03-1234567"
                className={inputCls(!!errors.physician_phone)}
                {...register("physician_phone")}
              />
            </FieldWrapper>

            {/* Insurance Company */}
            <FieldWrapper
              label="Insurance Company"
              htmlFor="med-insurance_company"
              error={errors.insurance_company?.message}
            >
              <input
                id="med-insurance_company"
                type="text"
                placeholder="e.g. Harel, Phoenix, Menora"
                className={inputCls(!!errors.insurance_company)}
                {...register("insurance_company")}
              />
            </FieldWrapper>

            {/* Policy Number */}
            <FieldWrapper
              label="Policy Number"
              htmlFor="med-policy_number"
              error={errors.policy_number?.message}
            >
              <input
                id="med-policy_number"
                type="text"
                placeholder="e.g. POL-12345"
                className={inputCls(!!errors.policy_number)}
                {...register("policy_number")}
              />
            </FieldWrapper>

            {/* Medical Clearance Status — full width */}
            <div className="sm:col-span-2">
              <FieldWrapper
                label="Medical Clearance Status"
                htmlFor="med-medical_clearance_status"
                error={errors.medical_clearance_status?.message}
              >
                <select
                  id="med-medical_clearance_status"
                  className={selectCls(!!errors.medical_clearance_status)}
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

            {/* Allergies — full width */}
            <div className="sm:col-span-2">
              <FieldWrapper
                label="Allergies"
                htmlFor="med-allergies"
                error={errors.allergies?.message}
              >
                <textarea
                  id="med-allergies"
                  placeholder="List any known allergies (optional)"
                  className={textareaCls(!!errors.allergies)}
                  {...register("allergies")}
                />
              </FieldWrapper>
            </div>

            {/* Medications — full width */}
            <div className="sm:col-span-2">
              <FieldWrapper
                label="Medications"
                htmlFor="med-medications"
                error={errors.medications?.message}
              >
                <textarea
                  id="med-medications"
                  placeholder="Current medications and dosages (optional)"
                  className={textareaCls(!!errors.medications)}
                  {...register("medications")}
                />
              </FieldWrapper>
            </div>

            {/* Dietary Restrictions — full width */}
            <div className="sm:col-span-2">
              <FieldWrapper
                label="Dietary Restrictions"
                htmlFor="med-dietary_restrictions"
                error={errors.dietary_restrictions?.message}
              >
                <textarea
                  id="med-dietary_restrictions"
                  placeholder="Dietary needs or restrictions (optional)"
                  className={textareaCls(!!errors.dietary_restrictions)}
                  {...register("dietary_restrictions")}
                />
              </FieldWrapper>
            </div>
          </div>
        </div>

        {/* ── Sticky footer with Save button ── */}
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
      </div>
    </form>
  );
}
