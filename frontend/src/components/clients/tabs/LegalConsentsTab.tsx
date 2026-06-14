"use client";

import { AccordionSection } from "@/components/ui/AccordionSection";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Import our Tier 2 Controller
import { useLegalConsentsTabController } from "./controllers/LegalConsentsTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LegalConsentsTabProps {
  client: ClientDoc;
  isEditable: boolean;
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

function textareaCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[80px]",
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

const VIEW_INPUT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_TEXTAREA_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldWrapper({
  label, htmlFor, error, children,
}: {
  label: string; htmlFor: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function LegalConsentsTab({ client, isEditable }: LegalConsentsTabProps) {
  // Wire up the controller
  const { form, accordions, arrays, submission } = useLegalConsentsTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  const le = errors.legal_consents;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Release of Information ════ */}
          <AccordionSection
            title="Release of Information"
            description="Authorization details for sharing client information with third parties."
            isOpen={accordions.open.release}
            onToggle={() => accordions.toggle("release")}
            hasError={!!(le?.release_authorizing_person || le?.info_to_disclose || le?.release_reason || le?.release_expiration_date || le?.release_expiration_event || le?.authorized_agencies)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldWrapper label="Release Authorizing Person" htmlFor="lc-release_authorizing_person" error={le?.release_authorizing_person?.message}>
                  <input
                    id="lc-release_authorizing_person" type="text" placeholder="Full name of the person authorizing the release" readOnly={!isEditable}
                    className={isEditable ? inputCls(!!le?.release_authorizing_person) : VIEW_INPUT_CLS}
                    {...register("legal_consents.release_authorizing_person")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Information to Disclose" htmlFor="lc-info_to_disclose" error={le?.info_to_disclose?.message}>
                  <textarea
                    id="lc-info_to_disclose" placeholder="Describe what information may be disclosed…" readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!le?.info_to_disclose) : VIEW_TEXTAREA_CLS}
                    {...register("legal_consents.info_to_disclose")}
                  />
                </FieldWrapper>
              </div>

              <div className="sm:col-span-2">
                <FieldWrapper label="Release Reason" htmlFor="lc-release_reason" error={le?.release_reason?.message}>
                  <textarea
                    id="lc-release_reason" placeholder="Purpose of the information release…" readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!le?.release_reason) : VIEW_TEXTAREA_CLS}
                    {...register("legal_consents.release_reason")}
                  />
                </FieldWrapper>
              </div>

              <FieldWrapper label="Release Expiration Date" htmlFor="lc-release_expiration_date" error={le?.release_expiration_date?.message}>
                <input
                  id="lc-release_expiration_date" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.release_expiration_date) : VIEW_INPUT_CLS}
                  {...register("legal_consents.release_expiration_date")}
                />
              </FieldWrapper>

              <FieldWrapper label="Release Expiration Event" htmlFor="lc-release_expiration_event" error={le?.release_expiration_event?.message}>
                <input
                  id="lc-release_expiration_event" type="text" placeholder="e.g. End of program enrollment" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.release_expiration_event) : VIEW_INPUT_CLS}
                  {...register("legal_consents.release_expiration_event")}
                />
              </FieldWrapper>
            </div>

            {/* ── Authorized Agencies dynamic list ── */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Authorized Agencies</h3>
                  <p className="text-xs text-slate-500">Organizations authorized to receive client information.</p>
                </div>
                {isEditable && (
                  <button
                    type="button" onClick={() => arrays.agencies.append("" as never)}
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    + Add Agency
                  </button>
                )}
              </div>

              {arrays.agencies.fields.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    No agencies listed.{isEditable && " Click \"+ Add Agency\" to add one."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {arrays.agencies.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      id={`lc-agency-${index}`} type="text" placeholder="e.g. Ministry of Health" readOnly={!isEditable}
                      className={isEditable ? inputCls(false) : VIEW_INPUT_CLS}
                      {...register(`legal_consents.authorized_agencies.${index}` as const)}
                    />
                    {isEditable && (
                      <button
                        type="button" onClick={() => arrays.agencies.remove(index)}
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
            isOpen={accordions.open.waiver}
            onToggle={() => accordions.toggle("waiver")}
            hasError={!!(le?.visit_waiver_child_name || le?.visit_waiver_signatures)}
          >
            <div className="grid gap-5">
              <FieldWrapper label="Child Name (Waiver)" htmlFor="lc-visit_waiver_child_name" error={le?.visit_waiver_child_name?.message}>
                <input
                  id="lc-visit_waiver_child_name" type="text" placeholder="Full name of the child covered by the waiver" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.visit_waiver_child_name) : VIEW_INPUT_CLS}
                  {...register("legal_consents.visit_waiver_child_name")}
                />
              </FieldWrapper>
            </div>

            {/* ── Visit Waiver Signatures dynamic list ── */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Waiver Signatures</h3>
                  <p className="text-xs text-slate-500">Names of guardians or parties who have signed the visit waiver.</p>
                </div>
                {isEditable && (
                  <button
                    type="button" onClick={() => arrays.signatures.append("" as never)}
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    + Add Signature
                  </button>
                )}
              </div>

              {arrays.signatures.fields.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    No signatures on file.{isEditable && " Click \"+ Add Signature\" to add one."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {arrays.signatures.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      id={`lc-signature-${index}`} type="text" placeholder="e.g. David Cohen" readOnly={!isEditable}
                      className={isEditable ? inputCls(false) : VIEW_INPUT_CLS}
                      {...register(`legal_consents.visit_waiver_signatures.${index}` as const)}
                    />
                    {isEditable && (
                      <button
                        type="button" onClick={() => arrays.signatures.remove(index)}
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
              <p className="text-xs font-medium text-amber-600">You have unsaved changes.</p>
            ) : (
              <p className="text-xs text-slate-400">All changes are saved.</p>
            )}
            <button
              type="submit" disabled={submission.isSaving || !isDirty}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                submission.isSaving || !isDirty ? "cursor-not-allowed bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700",
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