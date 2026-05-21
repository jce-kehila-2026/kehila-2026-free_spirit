"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  contactsStepSchema,
  CONTACT_RELATIONSHIP,
  type Contact,
  type ContactsFormData,
} from "@/schemas/clientSchema";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactsTabProps {
  client: ClientDoc;
  /** When false (default) all fields are read-only and the Save footer is hidden. */
  isEditable: boolean;
}

// ─── Default values for a new blank contact ───────────────────────────────────

const EMPTY_CONTACT: Contact = {
  contact_name: "",
  relationship: "other",
  phone: "",
  email: "",
  is_emergency_contact: false,
};

// ─── Shared styling helpers ───────────────────────────────────────────────────

// Edit-mode classes
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

// View-mode classes (clean typography, no interactive chrome)
const VIEW_INPUT_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";
const VIEW_SELECT_CLS =
  "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none appearance-none";

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
function sanitizeItem(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ContactsTab
 *
 * Tab 3 of ClientProfileDashboard — renders the contacts array using
 * useFieldArray extracted from ContactsStep.tsx.
 *
 * Owns its own react-hook-form instance (pre-filled from client.contacts)
 * and writes the entire contacts array to Firestore on "Save Changes".
 */
export default function ContactsTab({ client, isEditable }: ContactsTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ContactsFormData>({
    resolver: zodResolver(contactsStepSchema),
    mode: "onTouched",
    defaultValues: {
      contacts: (client.contacts ?? []).map((c) => ({
        contact_name:         c.contact_name         ?? "",
        relationship:         c.relationship         ?? "other",
        phone:                c.phone                ?? "",
        email:                c.email                ?? "",
        is_emergency_contact: c.is_emergency_contact ?? false,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  // Top-level array error (e.g. "at least one contact required")
  const arrayError =
    (errors.contacts as { message?: string } | undefined)?.message ??
    (errors.contacts as { root?: { message?: string } } | undefined)?.root?.message;

  // ── Save handler ──────────────────────────────────────────────────────────

  async function onSubmit(data: ContactsFormData) {
    setIsSaving(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        // contacts is a top-level array field in the Firestore schema.
        contacts: data.contacts.map((c) => sanitizeItem(c as Record<string, unknown>)),
        updated_at: serverTimestamp(),
      });
      toast.success("Contacts saved successfully.");
    } catch (err) {
      console.error("[ContactsTab] Firestore update failed:", err);
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
              <h2 className="text-base font-bold text-slate-800">Contacts</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Emergency and reference contacts for this client.
              </p>
            </div>
            {/* Add button — edit mode only */}
            {isEditable && (
              <button
                type="button"
                id="btn-contacts-add"
                onClick={() => append(EMPTY_CONTACT)}
                className={[
                  "shrink-0 rounded-lg bg-indigo-600 px-4 py-2",
                  "text-sm font-semibold text-white shadow-sm",
                  "transition-colors hover:bg-indigo-700",
                ].join(" ")}
              >
                + Add Contact
              </button>
            )}
          </div>

          {/* Array-level error */}
          {arrayError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
            >
              {arrayError}
            </p>
          )}

          {/* Empty state */}
          {fields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                No contacts added yet. Click{" "}
                <strong className="text-slate-600">&quot;+ Add Contact&quot;</strong>{" "}
                above to get started.
              </p>
            </div>
          )}

          {/* Contact cards */}
          <div className="space-y-5">
            {fields.map((field, index) => {
              const contactErrors = errors.contacts as
                | Record<number, Record<string, { message?: string }>>
                | undefined;
              const ce = contactErrors?.[index];

              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                >
                  {/* Card header */}
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">
                      Contact #{index + 1}
                    </h3>
                    {/* Remove button — edit mode only */}
                    {isEditable && (
                      <button
                        type="button"
                        id={`btn-contacts-remove-${index}`}
                        onClick={() => remove(index)}
                        className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Card fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Contact Name */}
                    <FieldWrapper
                      label="Contact Name"
                      htmlFor={`ct-contact_name-${index}`}
                      error={ce?.contact_name?.message}
                      required
                    >
                      <input
                        id={`ct-contact_name-${index}`}
                        type="text"
                        placeholder="e.g. Miriam Cohen"
                        readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.contact_name) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.contact_name`)}
                      />
                    </FieldWrapper>

                    {/* Relationship */}
                    <FieldWrapper
                      label="Relationship"
                      htmlFor={`ct-relationship-${index}`}
                      error={ce?.relationship?.message}
                      required
                    >
                      <select
                        id={`ct-relationship-${index}`}
                        disabled={!isEditable}
                        className={isEditable ? selectCls(!!ce?.relationship) : VIEW_SELECT_CLS}
                        {...register(`contacts.${index}.relationship`)}
                      >
                        <option value="">Select relationship…</option>
                        {CONTACT_RELATIONSHIP.map((r) => (
                          <option key={r} value={r}>
                            {humanize(r)}
                          </option>
                        ))}
                      </select>
                    </FieldWrapper>

                    {/* Phone */}
                    <FieldWrapper
                      label="Phone"
                      htmlFor={`ct-phone-${index}`}
                      error={ce?.phone?.message}
                      required
                    >
                      <input
                        id={`ct-phone-${index}`}
                        type="tel"
                        placeholder="e.g. 050-1234567"
                        readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.phone) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.phone`)}
                      />
                    </FieldWrapper>

                    {/* Email */}
                    <FieldWrapper
                      label="Email"
                      htmlFor={`ct-email-${index}`}
                      error={ce?.email?.message}
                    >
                      <input
                        id={`ct-email-${index}`}
                        type="email"
                        placeholder="e.g. miriam@email.com"
                        readOnly={!isEditable}
                        className={isEditable ? inputCls(!!ce?.email) : VIEW_INPUT_CLS}
                        {...register(`contacts.${index}.email`)}
                      />
                    </FieldWrapper>

                    {/* Emergency contact checkbox — full width */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`ct-is_emergency-${index}`}
                        className={[
                          "inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors",
                          isEditable ? "cursor-pointer hover:bg-slate-50" : "cursor-default",
                        ].join(" ")}
                      >
                        <input
                          id={`ct-is_emergency-${index}`}
                          type="checkbox"
                          disabled={!isEditable}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          {...register(`contacts.${index}.is_emergency_contact`)}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          Emergency contact
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
              id="btn-contacts-save"
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
