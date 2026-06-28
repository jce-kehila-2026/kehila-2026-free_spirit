"use client";

import { AccordionSection } from "@/components/ui/AccordionSection";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import CustomFieldsSection from "@/components/clients/fields/CustomFieldsSection";

// Import our Tier 2 Controller
import { useLogisticsTabController } from "./controllers/LogisticsTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogisticsTabProps {
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

export default function LogisticsTab({ client, isEditable }: LogisticsTabProps) {
  // Wire up the controller
  const { form, accordions, submission } = useLogisticsTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  const le = errors.logistics;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Travel & Visit Details ════ */}
          <AccordionSection
            title="Travel & Visit Details"
            description="Entry date and declared purpose from the client's visa or travel form."
            isOpen={accordions.open.travel}
            onToggle={() => accordions.toggle("travel")}
            hasError={!!(errors.date_of_entry || errors.purpose_of_visit)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Date of Entry" htmlFor="log-date_of_entry" error={errors.date_of_entry?.message}>
                <input
                  id="log-date_of_entry" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!errors.date_of_entry) : VIEW_INPUT_CLS}
                  {...register("date_of_entry")}
                />
              </FieldWrapper>

              <div className="sm:col-span-2">
                <FieldWrapper label="Purpose of Visit" htmlFor="log-purpose_of_visit" error={errors.purpose_of_visit?.message}>
                  <textarea
                    id="log-purpose_of_visit" placeholder="e.g. Program participation, medical treatment…" readOnly={!isEditable}
                    className={isEditable ? textareaCls(!!errors.purpose_of_visit) : VIEW_TEXTAREA_CLS}
                    {...register("purpose_of_visit")}
                  />
                </FieldWrapper>
              </div>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Insurance ════ */}
          <AccordionSection
            title="Insurance Details"
            description="Agent contact information and coverage period."
            isOpen={accordions.open.insurance}
            onToggle={() => accordions.toggle("insurance")}
            hasError={!!(le?.insurance_agent_name || le?.insurance_agent_number || le?.insurance_period_start || le?.insurance_period_end)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Insurance Agent Name" htmlFor="log-insurance_agent_name" error={le?.insurance_agent_name?.message}>
                <input
                  id="log-insurance_agent_name" type="text" placeholder="e.g. Avi Cohen" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.insurance_agent_name) : VIEW_INPUT_CLS}
                  {...register("logistics.insurance_agent_name")}
                />
              </FieldWrapper>

              <FieldWrapper label="Insurance Agent Phone" htmlFor="log-insurance_agent_number" error={le?.insurance_agent_number?.message}>
                <input
                  id="log-insurance_agent_number" type="tel" placeholder="e.g. 050-1234567" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.insurance_agent_number) : VIEW_INPUT_CLS}
                  {...register("logistics.insurance_agent_number")}
                />
              </FieldWrapper>

              <FieldWrapper label="Coverage Period Start" htmlFor="log-insurance_period_start" error={le?.insurance_period_start?.message}>
                <input
                  id="log-insurance_period_start" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.insurance_period_start) : VIEW_INPUT_CLS}
                  {...register("logistics.insurance_period_start")}
                />
              </FieldWrapper>

              <FieldWrapper label="Coverage Period End" htmlFor="log-insurance_period_end" error={le?.insurance_period_end?.message}>
                <input
                  id="log-insurance_period_end" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.insurance_period_end) : VIEW_INPUT_CLS}
                  {...register("logistics.insurance_period_end")}
                />
              </FieldWrapper>
            </div>
          </AccordionSection>

          {/* ════ Section 3: Program ════ */}
          <AccordionSection
            title="Program Details"
            description="Assigned consultant and program start date."
            isOpen={accordions.open.program}
            onToggle={() => accordions.toggle("program")}
            hasError={!!(le?.program_consultant || le?.program_start_date)}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper label="Program Consultant" htmlFor="log-program_consultant" error={le?.program_consultant?.message}>
                <input
                  id="log-program_consultant" type="text" placeholder="e.g. Sarah Levy" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.program_consultant) : VIEW_INPUT_CLS}
                  {...register("logistics.program_consultant")}
                />
              </FieldWrapper>

              <FieldWrapper label="Program Start Date" htmlFor="log-program_start_date" error={le?.program_start_date?.message}>
                <input
                  id="log-program_start_date" type="date" readOnly={!isEditable}
                  className={isEditable ? inputCls(!!le?.program_start_date) : VIEW_INPUT_CLS}
                  {...register("logistics.program_start_date")}
                />
              </FieldWrapper>
            </div>
          </AccordionSection>
        </div>

        {/* ── Sticky footer (edit mode only) ── */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <CustomFieldsSection tab="logistics" client={client} isEditable={isEditable} />
        </div>

        {isEditable && (
          <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
            {isDirty ? (
              <p className="text-xs font-medium text-amber-600">You have unsaved changes.</p>
            ) : (
              <p className="text-xs text-slate-400">All changes are saved.</p>
            )}
            <button
              type="submit" id="btn-logistics-save" disabled={submission.isSaving || !isDirty}
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
