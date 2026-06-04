"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import { z } from "zod";
import { logisticsSchema } from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogisticsTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
}

// ─── Tab-level form schema ────────────────────────────────────────────────────

const logisticsTabSchema = z.object({
  date_of_entry:    z.string().optional().or(z.literal("")),
  purpose_of_visit: z.string().trim().max(500).optional().or(z.literal("")),
  logistics:        logisticsSchema,
});
type LogisticsTabFormData = z.infer<typeof logisticsTabSchema>;

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

const VIEW_INPUT_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_TEXTAREA_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
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
 * LogisticsTab
 *
 * Displays and edits visit/travel details (date of entry, purpose of visit)
 * together with the nested `logistics` object (insurance scheduling,
 * program consultant, and program start date).
 */
export default function LogisticsTab({ client, isEditable }: LogisticsTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<LogisticsTabFormData>({
    resolver: zodResolver(logisticsTabSchema),
    mode: "onTouched",
    defaultValues: {
      date_of_entry:    client.date_of_entry    ?? "",
      purpose_of_visit: client.purpose_of_visit ?? "",
      logistics: {
        insurance_agent_name:   client.logistics?.insurance_agent_name   ?? "",
        insurance_agent_number: client.logistics?.insurance_agent_number ?? "",
        insurance_period_start: client.logistics?.insurance_period_start ?? "",
        insurance_period_end:   client.logistics?.insurance_period_end   ?? "",
        program_consultant:     client.logistics?.program_consultant     ?? "",
        program_start_date:     client.logistics?.program_start_date     ?? "",
      },
    },
  });

  // ── Save handler ────────────────────────────────────────────────────────────

  async function onSubmit(data: LogisticsTabFormData) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        ...sanitize(data as Record<string, unknown>),
        updated_at: serverTimestamp(),
      });
      toast.success("Logistics saved successfully.");
    } catch (err) {
      console.error("[LogisticsTab] Firestore update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const le = errors.logistics;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* ── Scrollable body ── */}
        <div className="space-y-10 p-6 sm:p-8">

          {/* ════ Section 1: Travel & Visit Details ════ */}
          <section>
            <SectionHeading
              title="Travel &amp; Visit Details"
              description="Entry date and declared purpose from the client's visa or travel form."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Date of Entry */}
              <FieldWrapper
                label="Date of Entry"
                htmlFor="log-date_of_entry"
                error={errors.date_of_entry?.message}
              >
                <input
                  id="log-date_of_entry"
                  type="date"
                  readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.date_of_entry) : VIEW_INPUT_CLS}
                  {...register("date_of_entry")}
                />
              </FieldWrapper>

              {/* Purpose of Visit — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Purpose of Visit"
                  htmlFor="log-purpose_of_visit"
                  error={errors.purpose_of_visit?.message}
                >
                  <textarea
                    id="log-purpose_of_visit"
                    placeholder="e.g. Program participation, medical treatment…"
                    readOnly={!isEditable}
                    className={
                      isEditable
                        ? textareaCls(!!errors.purpose_of_visit)
                        : VIEW_TEXTAREA_CLS
                    }
                    {...register("purpose_of_visit")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* ════ Section 2: Insurance ════ */}
          <section>
            <SectionHeading
              title="Insurance Details"
              description="Agent contact information and coverage period."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Agent Name */}
              <FieldWrapper
                label="Insurance Agent Name"
                htmlFor="log-insurance_agent_name"
                error={le?.insurance_agent_name?.message}
              >
                <input
                  id="log-insurance_agent_name"
                  type="text"
                  placeholder="e.g. Avi Cohen"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.insurance_agent_name)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.insurance_agent_name")}
                />
              </FieldWrapper>

              {/* Agent Phone */}
              <FieldWrapper
                label="Insurance Agent Phone"
                htmlFor="log-insurance_agent_number"
                error={le?.insurance_agent_number?.message}
              >
                <input
                  id="log-insurance_agent_number"
                  type="tel"
                  placeholder="e.g. 050-1234567"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.insurance_agent_number)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.insurance_agent_number")}
                />
              </FieldWrapper>

              {/* Coverage Start */}
              <FieldWrapper
                label="Coverage Period Start"
                htmlFor="log-insurance_period_start"
                error={le?.insurance_period_start?.message}
              >
                <input
                  id="log-insurance_period_start"
                  type="date"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.insurance_period_start)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.insurance_period_start")}
                />
              </FieldWrapper>

              {/* Coverage End */}
              <FieldWrapper
                label="Coverage Period End"
                htmlFor="log-insurance_period_end"
                error={le?.insurance_period_end?.message}
              >
                <input
                  id="log-insurance_period_end"
                  type="date"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.insurance_period_end)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.insurance_period_end")}
                />
              </FieldWrapper>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* ════ Section 3: Program ════ */}
          <section>
            <SectionHeading
              title="Program Details"
              description="Assigned consultant and program start date."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Program Consultant */}
              <FieldWrapper
                label="Program Consultant"
                htmlFor="log-program_consultant"
                error={le?.program_consultant?.message}
              >
                <input
                  id="log-program_consultant"
                  type="text"
                  placeholder="e.g. Sarah Levy"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.program_consultant)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.program_consultant")}
                />
              </FieldWrapper>

              {/* Program Start Date */}
              <FieldWrapper
                label="Program Start Date"
                htmlFor="log-program_start_date"
                error={le?.program_start_date?.message}
              >
                <input
                  id="log-program_start_date"
                  type="date"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.program_start_date)
                      : VIEW_INPUT_CLS
                  }
                  {...register("logistics.program_start_date")}
                />
              </FieldWrapper>
            </div>
          </section>
        </div>

        {/* ── Sticky footer (edit mode only) ── */}
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
              id="btn-logistics-save"
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
        )}
      </div>
    </form>
  );
}
