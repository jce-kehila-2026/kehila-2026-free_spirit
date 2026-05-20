"use client";

import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  financialAidTabSchema,
  FINANCIAL_AID_STATUS,
  type FinancialAidTabFormData,
  type FinancialAidApplication,
} from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancialAidTabProps {
  client: ClientDoc;
}

// ─── Default values for a new blank application ───────────────────────────────

const EMPTY_APPLICATION: FinancialAidApplication = {
  status: "pending",
  requested_amount: undefined,
  awarded_amount: undefined,
  application_date: "",
  review_notes: "",
};

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  FinancialAidApplication["status"],
  { bg: string; text: string }
> = {
  pending:      { bg: "bg-slate-100",  text: "text-slate-600"  },
  under_review: { bg: "bg-amber-50",   text: "text-amber-700"  },
  approved:     { bg: "bg-emerald-50", text: "text-emerald-700" },
  rejected:     { bg: "bg-red-50",     text: "text-red-700"    },
  on_hold:      { bg: "bg-purple-50",  text: "text-purple-700" },
};

/** Human-readable label for enum values (title-case, underscores → spaces). */
function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shared styling helpers ───────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400 transition-colors duration-150",
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
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

// ─── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
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
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
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
function sanitizeItem(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FinancialAidTab
 *
 * Tab 5 of ClientProfileDashboard — manages an array of financial aid
 * applications stored as `financial_aid_applications[]` on the client document.
 *
 * Managers can add new applications, edit existing ones, and remove them.
 * Uses the same standalone useForm + useFieldArray + sticky-footer pattern
 * established in ContactsTab.
 */
export default function FinancialAidTab({ client }: FinancialAidTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FinancialAidTabFormData>({
    resolver: zodResolver(financialAidTabSchema),
    mode: "onTouched",
    defaultValues: {
      financial_aid_applications: (
        client.financial_aid_applications ?? []
      ).map((app) => ({
        status:            app.status            ?? "pending",
        requested_amount:  app.requested_amount,
        awarded_amount:    app.awarded_amount,
        application_date:  app.application_date  ?? "",
        review_notes:      app.review_notes      ?? "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "financial_aid_applications",
  });

  // Subscribe to status changes to drive the per-card badge in real time.
  // useWatch is the memoization-safe alternative to watch() for subscriptions.
  const watchedStatuses = useWatch({
    control,
    name: "financial_aid_applications",
  });

  // ── Save handler ──────────────────────────────────────────────────────────

  async function onSubmit(data: FinancialAidTabFormData) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        financial_aid_applications: data.financial_aid_applications.map(
          (app) => sanitizeItem(app as Record<string, unknown>)
        ),
        updated_at: serverTimestamp(),
      });
      toast.success("Financial aid applications saved successfully.");
    } catch (err) {
      console.error("[FinancialAidTab] Firestore update failed:", err);
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
          {/* Section heading + Add button */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Financial Aid Applications
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Track aid requests, awarded amounts, and review notes over time.
              </p>
            </div>
            <button
              type="button"
              id="btn-financial-add"
              onClick={() => append(EMPTY_APPLICATION)}
              className={[
                "shrink-0 rounded-lg bg-indigo-600 px-4 py-2",
                "text-sm font-semibold text-white shadow-sm",
                "transition-colors hover:bg-indigo-700",
              ].join(" ")}
            >
              + New Application
            </button>
          </div>

          {/* Empty state */}
          {fields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                No financial aid applications on record. Click{" "}
                <strong className="text-slate-600">
                  &quot;+ New Application&quot;
                </strong>{" "}
                above to add the first one.
              </p>
            </div>
          )}

          {/* Application cards */}
          <div className="space-y-6">
            {fields.map((field, index) => {
              // Per-card error accessor
              const appErrors = errors.financial_aid_applications;
              const ae = Array.isArray(appErrors) ? appErrors[index] : undefined;

              // Live status for the badge
              const currentStatus =
                watchedStatuses?.[index]?.status ?? field.status;
              const badge = STATUS_BADGE[currentStatus] ?? STATUS_BADGE.pending;

              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-700">
                        Application #{index + 1}
                      </h3>
                      {/* Live status badge */}
                      <span
                        className={[
                          "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          badge.bg,
                          badge.text,
                          "border-transparent",
                        ].join(" ")}
                      >
                        {humanize(currentStatus)}
                      </span>
                    </div>
                    <button
                      type="button"
                      id={`btn-financial-remove-${index}`}
                      onClick={() => remove(index)}
                      className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  {/* Card fields */}
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    {/* Status — full width */}
                    <div className="sm:col-span-2">
                      <FieldWrapper
                        label="Application Status"
                        htmlFor={`fa-status-${index}`}
                        error={ae?.status?.message}
                        required
                      >
                        <select
                          id={`fa-status-${index}`}
                          className={selectCls(!!ae?.status)}
                          {...register(
                            `financial_aid_applications.${index}.status`
                          )}
                        >
                          {FINANCIAL_AID_STATUS.map((s) => (
                            <option key={s} value={s}>
                              {humanize(s)}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>
                    </div>

                    {/* Requested Amount */}
                    <FieldWrapper
                      label="Requested Amount (₪)"
                      htmlFor={`fa-requested-${index}`}
                      hint="Leave blank if not yet determined"
                      error={ae?.requested_amount?.message}
                    >
                      <input
                        id={`fa-requested-${index}`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 5000"
                        className={inputCls(!!ae?.requested_amount)}
                        {...register(
                          `financial_aid_applications.${index}.requested_amount`
                        )}
                      />
                    </FieldWrapper>

                    {/* Awarded Amount */}
                    <FieldWrapper
                      label="Awarded Amount (₪)"
                      htmlFor={`fa-awarded-${index}`}
                      hint="Fill once the decision is made"
                      error={ae?.awarded_amount?.message}
                    >
                      <input
                        id={`fa-awarded-${index}`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 3000"
                        className={inputCls(!!ae?.awarded_amount)}
                        {...register(
                          `financial_aid_applications.${index}.awarded_amount`
                        )}
                      />
                    </FieldWrapper>

                    {/* Application Date — full width */}
                    <div className="sm:col-span-2">
                      <FieldWrapper
                        label="Application Date"
                        htmlFor={`fa-date-${index}`}
                        error={ae?.application_date?.message}
                      >
                        <input
                          id={`fa-date-${index}`}
                          type="date"
                          className={inputCls(!!ae?.application_date)}
                          {...register(
                            `financial_aid_applications.${index}.application_date`
                          )}
                        />
                      </FieldWrapper>
                    </div>

                    {/* Review Notes — full width */}
                    <div className="sm:col-span-2">
                      <FieldWrapper
                        label="Review Notes"
                        htmlFor={`fa-notes-${index}`}
                        error={ae?.review_notes?.message}
                      >
                        <textarea
                          id={`fa-notes-${index}`}
                          placeholder="Reason for decision, conditions attached, follow-up actions… (optional)"
                          className={textareaCls(!!ae?.review_notes)}
                          {...register(
                            `financial_aid_applications.${index}.review_notes`
                          )}
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                </div>
              );
            })}
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
            id="btn-financial-save"
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
