"use client";

import type { FieldErrors } from "react-hook-form";
import { CONTACT_RELATIONSHIP } from "@/schema/constants";
import type { Contact } from "@/schema/contactSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Import our Tier 2 Controller
import { useContactsTabController, EMPTY_CONTACT } from "./controllers/ContactsTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactsTabProps {
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

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

const VIEW_INPUT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_SELECT_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none appearance-none";

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── FieldWrapper (Pure UI) ───────────────────────────────────────────────────

function FieldWrapper({
  label, htmlFor, error, required = false, children,
}: {
  label: string; htmlFor: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function ContactsTab({ client, isEditable }: ContactsTabProps) {
  // Wire up the controller
  const { form, contacts, arrayError, submission } = useContactsTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Contacts</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Emergency and reference contacts for this client.
              </p>
            </div>
            {isEditable && (
              <button
                type="button" id="btn-contacts-add"
                onClick={() => contacts.append(EMPTY_CONTACT)}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                + Add Contact
              </button>
            )}
          </div>

          {arrayError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {arrayError}
            </p>
          )}

          {contacts.fields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                No contacts added yet. Click <strong className="text-slate-600">&quot;+ Add Contact&quot;</strong> above to get started.
              </p>
            </div>
          )}

          <div className="space-y-5">
            {contacts.fields.map((field, index) => {
              
              const contactErrors = errors.contacts as FieldErrors<Contact>[];
              const ce = contactErrors?.[index];

              return (
                <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">Contact #{index + 1}</h3>
                    {isEditable && (
                      <button
                        type="button" id={`btn-contacts-remove-${index}`}
                        onClick={() => contacts.remove(index)}
                        className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldWrapper label="Contact Name" htmlFor={`ct-contact_name-${index}`} error={ce?.contact_name?.message} required>
                      <input
                        id={`ct-contact_name-${index}`} type="text" placeholder="e.g. Miriam Cohen" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.contact_name) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.contact_name` as const)}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Relationship" htmlFor={`ct-relationship-${index}`} error={ce?.relationship?.message} required>
                      <select
                        id={`ct-relationship-${index}`} disabled={!isEditable}
                        className={isEditable ? selectCls(!!ce?.relationship) : VIEW_SELECT_CLS}
                        {...register(`contacts.${index}.relationship` as const)}
                      >
                        <option value="">Select relationship…</option>
                        {CONTACT_RELATIONSHIP.map((r) => (
                          <option key={r} value={r}>{humanize(r)}</option>
                        ))}
                      </select>
                    </FieldWrapper>

                    <FieldWrapper label="Phone" htmlFor={`ct-phone-${index}`} error={ce?.phone?.message} required>
                      <input
                        id={`ct-phone-${index}`} type="tel" placeholder="e.g. 050-1234567" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.phone) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.phone` as const)}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Email" htmlFor={`ct-email-${index}`} error={ce?.email?.message}>
                      <input
                        id={`ct-email-${index}`} type="email" placeholder="e.g. miriam@email.com" readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.email) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.email` as const)}
                      />
                    </FieldWrapper>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`ct-is_emergency-${index}`}
                        className={[
                          "inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors",
                          isEditable ? "cursor-pointer hover:bg-slate-50" : "cursor-default",
                        ].join(" ")}
                      >
                        <input
                          id={`ct-is_emergency-${index}`} type="checkbox" disabled={!isEditable}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          {...register(`contacts.${index}.is_emergency_contact` as const)}
                        />
                        <span className="text-sm font-medium text-slate-700">Emergency contact</span>
                      </label>
                    </div>
                  </div>
                </div>
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
              type="submit" id="btn-contacts-save" disabled={submission.isSaving || !isDirty}
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