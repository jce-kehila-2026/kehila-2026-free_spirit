"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import { z } from "zod";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { legalConsentsSchema } from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LegalConsentsTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
}

// ─── Tab-level form schema ────────────────────────────────────────────────────

const legalConsentsTabSchema = z.object({
  legal_consents: legalConsentsSchema,
});
type LegalConsentsTabFormData = z.infer<typeof legalConsentsTabSchema>;

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

// SectionHeading retired — AccordionSection renders its own header

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
 * LegalConsentsTab
 *
 * Displays and edits all legal consent fields extracted from legacy PDF forms.
 * Includes two dynamic lists managed by useFieldArray:
 *   - authorized_agencies
 *   - visit_waiver_signatures
 *
 * Add/Remove buttons for both lists are hidden in view mode.
 */
export default function LegalConsentsTab({ client, isEditable }: LegalConsentsTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  // ── Accordion state ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState({ release: true, waiver: false });
  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const lc = client.legal_consents;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<LegalConsentsTabFormData>({
    resolver: zodResolver(legalConsentsTabSchema),
    mode: "onTouched",
    defaultValues: {
      legal_consents: {
        release_authorizing_person: lc?.release_authorizing_person ?? "",
        authorized_agencies:        (lc?.authorized_agencies ?? []).map((a) => a),
        info_to_disclose:           lc?.info_to_disclose           ?? "",
        release_reason:             lc?.release_reason             ?? "",
        release_expiration_date:    lc?.release_expiration_date    ?? "",
        release_expiration_event:   lc?.release_expiration_event   ?? "",
        visit_waiver_child_name:    lc?.visit_waiver_child_name    ?? "",
        visit_waiver_signatures:    (lc?.visit_waiver_signatures ?? []).map((s) => s),
      },
    },
  });

  // ── Dynamic arrays ─────────────────────────────────────────────────────────

  const agenciesArray = useFieldArray({
    control,
    // authorized_agencies is string[], so we use a wrapper trick:
    // react-hook-form requires objects in useFieldArray, so we use a path
    // that correctly targets the array.
    name: "legal_consents.authorized_agencies" as never,
  });

  const signaturesArray = useFieldArray({
    control,
    name: "legal_consents.visit_waiver_signatures" as never,
  });

  // ── Save handler ────────────────────────────────────────────────────────────

  async function onSubmit(data: LegalConsentsTabFormData) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        ...sanitize(data as Record<string, unknown>),
        updated_at: serverTimestamp(),
      });
      toast.success("Legal consents saved successfully.");
    } catch (err) {
      console.error("[LegalConsentsTab] Firestore update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const le = errors.legal_consents;

  // ── Auto-expand sections that contain validation errors ───────────────────────
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        le?.release_authorizing_person ||
        le?.info_to_disclose ||
        le?.release_reason ||
        le?.release_expiration_date ||
        le?.release_expiration_event ||
        le?.authorized_agencies
      ) {
        setOpen((prev) => ({ ...prev, release: true }));
      }
      if (le?.visit_waiver_child_name || le?.visit_waiver_signatures) {
        setOpen((prev) => ({ ...prev, waiver: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    le?.release_authorizing_person,
    le?.info_to_disclose,
    le?.release_reason,
    le?.release_expiration_date,
    le?.release_expiration_event,
    le?.authorized_agencies,
    le?.visit_waiver_child_name,
    le?.visit_waiver_signatures,
  ]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* ── Scrollable body ── */}
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Release of Information ════ */}
          <AccordionSection
            title="Release of Information"
            description="Authorization details for sharing client information with third parties."
            isOpen={open.release}
            onToggle={() => toggleSection("release")}
            hasError={!!(le?.release_authorizing_person || le?.info_to_disclose || le?.release_reason || le?.release_expiration_date || le?.release_expiration_event || le?.authorized_agencies)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Authorizing Person */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Release Authorizing Person"
                  htmlFor="lc-release_authorizing_person"
                  error={le?.release_authorizing_person?.message}
                >
                  <input
                    id="lc-release_authorizing_person"
                    type="text"
                    placeholder="Full name of the person authorizing the release"
                    readOnly={!isEditable}
                    className={
                      isEditable
                        ? inputCls(!!le?.release_authorizing_person)
                        : VIEW_INPUT_CLS
                    }
                    {...register("legal_consents.release_authorizing_person")}
                  />
                </FieldWrapper>
              </div>

              {/* Info to Disclose */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Information to Disclose"
                  htmlFor="lc-info_to_disclose"
                  error={le?.info_to_disclose?.message}
                >
                  <textarea
                    id="lc-info_to_disclose"
                    placeholder="Describe what information may be disclosed…"
                    readOnly={!isEditable}
                    className={
                      isEditable
                        ? textareaCls(!!le?.info_to_disclose)
                        : VIEW_TEXTAREA_CLS
                    }
                    {...register("legal_consents.info_to_disclose")}
                  />
                </FieldWrapper>
              </div>

              {/* Release Reason */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Release Reason"
                  htmlFor="lc-release_reason"
                  error={le?.release_reason?.message}
                >
                  <textarea
                    id="lc-release_reason"
                    placeholder="Purpose of the information release…"
                    readOnly={!isEditable}
                    className={
                      isEditable
                        ? textareaCls(!!le?.release_reason)
                        : VIEW_TEXTAREA_CLS
                    }
                    {...register("legal_consents.release_reason")}
                  />
                </FieldWrapper>
              </div>

              {/* Expiration Date */}
              <FieldWrapper
                label="Release Expiration Date"
                htmlFor="lc-release_expiration_date"
                error={le?.release_expiration_date?.message}
              >
                <input
                  id="lc-release_expiration_date"
                  type="date"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.release_expiration_date)
                      : VIEW_INPUT_CLS
                  }
                  {...register("legal_consents.release_expiration_date")}
                />
              </FieldWrapper>

              {/* Expiration Event */}
              <FieldWrapper
                label="Release Expiration Event"
                htmlFor="lc-release_expiration_event"
                error={le?.release_expiration_event?.message}
              >
                <input
                  id="lc-release_expiration_event"
                  type="text"
                  placeholder="e.g. End of program enrollment"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.release_expiration_event)
                      : VIEW_INPUT_CLS
                  }
                  {...register("legal_consents.release_expiration_event")}
                />
              </FieldWrapper>
            </div>

            {/* ── Authorized Agencies dynamic list ── */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Authorized Agencies</h3>
                  <p className="text-xs text-slate-500">
                    Organizations authorized to receive client information.
                  </p>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    id="btn-lc-add-agency"
                    onClick={() => agenciesArray.append("" as never)}
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    + Add Agency
                  </button>
                )}
              </div>

              {agenciesArray.fields.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    No agencies listed.{isEditable && " Click \"+ Add Agency\" to add one."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {agenciesArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <input
                      id={`lc-agency-${index}`}
                      type="text"
                      placeholder="e.g. Ministry of Health"
                      readOnly={!isEditable}
                      className={
                        isEditable
                          ? inputCls(false)
                          : VIEW_INPUT_CLS
                      }
                      {...register(
                        `legal_consents.authorized_agencies.${index}` as "legal_consents.authorized_agencies"
                      )}
                    />
                    {isEditable && (
                      <button
                        type="button"
                        id={`btn-lc-remove-agency-${index}`}
                        onClick={() => agenciesArray.remove(index)}
                        className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Visit Waiver ════ */}
          <AccordionSection
            title="Visit Waiver"
            description="Child name and signatures on file for visit consent."
            isOpen={open.waiver}
            onToggle={() => toggleSection("waiver")}
            hasError={!!(le?.visit_waiver_child_name || le?.visit_waiver_signatures)}
          >
            <div className="grid gap-5">
              <FieldWrapper
                label="Child Name (Waiver)"
                htmlFor="lc-visit_waiver_child_name"
                error={le?.visit_waiver_child_name?.message}
              >
                <input
                  id="lc-visit_waiver_child_name"
                  type="text"
                  placeholder="Full name of the child covered by the waiver"
                  readOnly={!isEditable}
                  className={
                    isEditable
                      ? inputCls(!!le?.visit_waiver_child_name)
                      : VIEW_INPUT_CLS
                  }
                  {...register("legal_consents.visit_waiver_child_name")}
                />
              </FieldWrapper>
            </div>

            {/* ── Visit Waiver Signatures dynamic list ── */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Waiver Signatures</h3>
                  <p className="text-xs text-slate-500">
                    Names of guardians or parties who have signed the visit waiver.
                  </p>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    id="btn-lc-add-signature"
                    onClick={() => signaturesArray.append("" as never)}
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    + Add Signature
                  </button>
                )}
              </div>

              {signaturesArray.fields.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    No signatures on file.{isEditable && " Click \"+ Add Signature\" to add one."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {signaturesArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <input
                      id={`lc-signature-${index}`}
                      type="text"
                      placeholder="e.g. David Cohen"
                      readOnly={!isEditable}
                      className={
                        isEditable
                          ? inputCls(false)
                          : VIEW_INPUT_CLS
                      }
                      {...register(
                        `legal_consents.visit_waiver_signatures.${index}` as "legal_consents.visit_waiver_signatures"
                      )}
                    />
                    {isEditable && (
                      <button
                        type="button"
                        id={`btn-lc-remove-signature-${index}`}
                        onClick={() => signaturesArray.remove(index)}
                        className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>
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
              id="btn-legal-save"
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
