"use client";

import { useFieldArray, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { FINANCIAL_AID_STATUS, type FinancialAidTabFormData, type FinancialAidApplication, type PaymentInstallment } from "@/schema/financialAidSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Import our Tier 2 Controller
import { useFinancialAidTabController, EMPTY_APPLICATION, EMPTY_INSTALLMENT } from "./controllers/FinancialAidTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancialAidTabProps {
  client: ClientDoc;
  isEditable: boolean;
}

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<FinancialAidApplication["status"], { bg: string; text: string }> = {
  pending:      { bg: "bg-slate-100",  text: "text-slate-600"  },
  under_review: { bg: "bg-amber-50",   text: "text-amber-700"  },
  approved:     { bg: "bg-emerald-50", text: "text-emerald-700" },
  rejected:     { bg: "bg-red-50",     text: "text-red-700"    },
  on_hold:      { bg: "bg-purple-50",  text: "text-purple-700" },
};

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
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
const VIEW_SELECT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none appearance-none";
const VIEW_TEXTAREA_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none resize-none";

// ─── FieldWrapper (Pure UI) ───────────────────────────────────────────────────

function FieldWrapper({
  label, htmlFor, hint, error, required = false, children,
}: {
  label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ─── Sub-Component: FinancialAidApplicationCard ───────────────────────────────

interface FinancialAidApplicationCardProps {
  nestIndex: number;
  control: Control<FinancialAidTabFormData>;
  register: UseFormRegister<FinancialAidTabFormData>;
  errors: FieldErrors<FinancialAidTabFormData>;
  isEditable: boolean;
  onRemove: () => void;
  status: FinancialAidApplication["status"];
}

function FinancialAidApplicationCard({
  nestIndex, control, register, errors, isEditable, onRemove, status,
}: FinancialAidApplicationCardProps) {
  // Nested array hook
  const { fields, append, remove } = useFieldArray({
    control,
    name: `financial_aid_applications.${nestIndex}.payment_installments`,
  });

  const appErrors = errors.financial_aid_applications;
  const ae = Array.isArray(appErrors) ? appErrors[nestIndex] : undefined;

  const currentStatus = status ?? "pending";
  const badge = STATUS_BADGE[currentStatus] ?? STATUS_BADGE.pending;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">Application #{nestIndex + 1}</h3>
          <span className={["rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent", badge.bg, badge.text].join(" ")}>
            {humanize(currentStatus)}
          </span>
        </div>
        {isEditable && (
          <button
            type="button" onClick={onRemove}
            className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            ✕ Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldWrapper label="Application Status" htmlFor={`fa-status-${nestIndex}`} error={ae?.status?.message} required>
            <select
              id={`fa-status-${nestIndex}`} disabled={!isEditable}
              className={isEditable ? selectCls(!!ae?.status) : VIEW_SELECT_CLS}
              {...register(`financial_aid_applications.${nestIndex}.status`)}
            >
              {FINANCIAL_AID_STATUS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </FieldWrapper>
        </div>

        <FieldWrapper label="Requested Amount (₪)" htmlFor={`fa-requested-${nestIndex}`} hint="Leave blank if not yet determined" error={ae?.requested_amount?.message}>
          <input
            id={`fa-requested-${nestIndex}`} type="number" min="0" step="1" placeholder="e.g. 5000" readOnly={!isEditable}
            className={isEditable ? inputCls(!!ae?.requested_amount) : VIEW_INPUT_CLS}
            {...register(`financial_aid_applications.${nestIndex}.requested_amount`)}
          />
        </FieldWrapper>

        <FieldWrapper label="Awarded Amount (₪)" htmlFor={`fa-awarded-${nestIndex}`} hint="Fill once the decision is made" error={ae?.awarded_amount?.message}>
          <input
            id={`fa-awarded-${nestIndex}`} type="number" min="0" step="1" placeholder="e.g. 3000" readOnly={!isEditable}
            className={isEditable ? inputCls(!!ae?.awarded_amount) : VIEW_INPUT_CLS}
            {...register(`financial_aid_applications.${nestIndex}.awarded_amount`)}
          />
        </FieldWrapper>

        <div className="sm:col-span-2">
          <FieldWrapper label="Application Date" htmlFor={`fa-date-${nestIndex}`} error={ae?.application_date?.message}>
            <input
              id={`fa-date-${nestIndex}`} type="date" readOnly={!isEditable}
              className={isEditable ? inputCls(!!ae?.application_date) : VIEW_INPUT_CLS}
              {...register(`financial_aid_applications.${nestIndex}.application_date`)}
            />
          </FieldWrapper>
        </div>

        <div className="sm:col-span-2">
          <FieldWrapper label="Financial Aid Parent Names" htmlFor={`fa-parents-${nestIndex}`} error={ae?.financial_aid_parent_names?.message}>
            <input
              id={`fa-parents-${nestIndex}`} type="text" placeholder="e.g. John and Jane Doe" readOnly={!isEditable}
              className={isEditable ? inputCls(!!ae?.financial_aid_parent_names) : VIEW_INPUT_CLS}
              {...register(`financial_aid_applications.${nestIndex}.financial_aid_parent_names`)}
            />
          </FieldWrapper>
        </div>

        <div className="sm:col-span-2">
          <FieldWrapper label="Circumstances" htmlFor={`fa-circumstances-${nestIndex}`} error={ae?.financial_aid_circumstances?.message}>
            <textarea
              id={`fa-circumstances-${nestIndex}`} placeholder="Details on financial circumstances…" readOnly={!isEditable}
              className={isEditable ? textareaCls(!!ae?.financial_aid_circumstances) : VIEW_TEXTAREA_CLS}
              {...register(`financial_aid_applications.${nestIndex}.financial_aid_circumstances`)}
            />
          </FieldWrapper>
        </div>

        <div className="sm:col-span-2">
          <FieldWrapper label="Review Notes" htmlFor={`fa-notes-${nestIndex}`} error={ae?.review_notes?.message}>
            <textarea
              id={`fa-notes-${nestIndex}`} placeholder="Reason for decision, conditions attached…" readOnly={!isEditable}
              className={isEditable ? textareaCls(!!ae?.review_notes) : VIEW_TEXTAREA_CLS}
              {...register(`financial_aid_applications.${nestIndex}.review_notes`)}
            />
          </FieldWrapper>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700">Payment Installments</h4>
          {isEditable && (
            <button
              type="button" onClick={() => append(EMPTY_INSTALLMENT)}
              className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              + Add Installment
            </button>
          )}
        </div>

        {fields.length === 0 ? (
          <p className="text-xs text-slate-400">No installments added yet.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((instField, instIndex) => {
              
              const instErrors = ae?.payment_installments as FieldErrors<PaymentInstallment>[];
              const ie = instErrors?.[instIndex];

              return (
                <div key={instField.id} className="relative rounded-lg border border-slate-200 bg-white p-4">
                  {isEditable && (
                    <button
                      type="button" onClick={() => remove(instIndex)}
                      className="absolute right-3 top-3 text-red-500 hover:text-red-700 focus:outline-none"
                    >
                      ✕
                    </button>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3 pr-6">
                    <FieldWrapper label="Amount" htmlFor={`inst-amount-${nestIndex}-${instIndex}`} error={ie?.amount?.message}>
                      <input
                        id={`inst-amount-${nestIndex}-${instIndex}`} type="number" min="0" step="1" placeholder="Amount" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ie?.amount) : VIEW_INPUT_CLS}
                        {...register(`financial_aid_applications.${nestIndex}.payment_installments.${instIndex}.amount` as const)}
                      />
                    </FieldWrapper>
                    
                    <FieldWrapper label="Due Date" htmlFor={`inst-due_date-${nestIndex}-${instIndex}`} error={ie?.due_date?.message}>
                      <input
                        id={`inst-due_date-${nestIndex}-${instIndex}`} type="date" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ie?.due_date) : VIEW_INPUT_CLS}
                        {...register(`financial_aid_applications.${nestIndex}.payment_installments.${instIndex}.due_date` as const)}
                      />
                    </FieldWrapper>
                    
                    <FieldWrapper label="Status" htmlFor={`inst-status-${nestIndex}-${instIndex}`} error={ie?.status?.message}>
                      <input
                        id={`inst-status-${nestIndex}-${instIndex}`} type="text" placeholder="Status" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ie?.status) : VIEW_INPUT_CLS}
                        {...register(`financial_aid_applications.${nestIndex}.payment_installments.${instIndex}.status` as const)}
                      />
                    </FieldWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function FinancialAidTab({ client, isEditable }: FinancialAidTabProps) {
  // Wire up the controller
  const { form, applications, submission } = useFinancialAidTabController(client);
  const { register, control, formState: { errors, isDirty }, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Financial Aid Applications</h2>
              <p className="mt-0.5 text-sm text-slate-500">Track aid requests, awarded amounts, and review notes over time.</p>
            </div>
            {isEditable && (
              <button
                type="button" onClick={() => applications.append(EMPTY_APPLICATION)}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                + New Application
              </button>
            )}
          </div>

          {applications.fields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                No financial aid applications on record. <br/>
                Add the first one by clicking above on <strong className="text-slate-600">&quot;+ Edit Profile&quot;</strong> and then <strong className="text-slate-600">&quot;+ New Application&quot;</strong>.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {applications.fields.map((field, index) => {
              const currentStatus = applications.watchedStatuses?.[index]?.status ?? field.status;

              return (
                <FinancialAidApplicationCard
                  key={field.id} nestIndex={index} control={control} register={register} errors={errors}
                  isEditable={isEditable} onRemove={() => applications.remove(index)} status={currentStatus as FinancialAidApplication["status"]}
                />
              );
            })}
          </div>
        </div>

        {/* ── Sticky footer ── */}
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