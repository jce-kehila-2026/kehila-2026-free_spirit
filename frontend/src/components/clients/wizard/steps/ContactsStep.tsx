"use client";

import { useEffect, useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type { ClientFormInput, Contact } from "@/schema/clientSchema";
import { CONTACT_RELATIONSHIP } from "@/schema/clientSchema";
import { AccordionSection } from "@/components/ui/AccordionSection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// ─── Default values for a new contact ─────────────────────────────────────────

const EMPTY_CONTACT = {
  contact_name: "",
  relationship: "",
  phone: "",
  email: "",
  is_emergency_contact: false,
} as unknown as Contact;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Step 4 — Contacts
 *
 * Uses `useFieldArray` to manage a dynamic list of contact cards.
 * Wrapped in a single accordion that is open by default.
 * Auto-expands if any contact field has a validation error.
 */
export default function ContactsStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ClientFormInput>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  const [isOpen, setIsOpen] = useState(true);

  // Top-level array error (e.g. "at least one contact required")
  const arrayError = errors.contacts?.message || errors.contacts?.root?.message;

  // Auto-expand if there are any contact errors
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (errors.contacts) {
      timeout = setTimeout(() => setIsOpen(true), 0);
    }
    return () => clearTimeout(timeout);
  }, [errors.contacts]);

  const hasError = !!errors.contacts;

  return (
    <AccordionSection
      title="Emergency Contacts"
      description="Add at least one emergency or reference contact."
      isOpen={isOpen}
      onToggle={() => setIsOpen((prev) => !prev)}
      hasError={hasError}
    >
      {/* Add contact button — lives inside header area via a sibling pattern */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          {/* Array-level error */}
          {arrayError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
            >
              {arrayError}
            </p>
          )}
        </div>
        <button
          type="button"
          id="btn-add-contact"
          onClick={() => append(EMPTY_CONTACT)}
          className={[
            "shrink-0 rounded-lg bg-indigo-600 px-4 py-2",
            "text-sm font-semibold text-white shadow-sm",
            "transition-colors hover:bg-indigo-700",
          ].join(" ")}
        >
          + Add Contact
        </button>
      </div>

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
                <button
                  type="button"
                  id={`btn-remove-contact-${index}`}
                  onClick={() => remove(index)}
                  className="rounded-md px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  ✕ Remove
                </button>
              </div>

              {/* Card fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Contact Name */}
                <FieldWrapper
                  label="Contact Name"
                  htmlFor={`contact_name_${index}`}
                  error={ce?.contact_name?.message}
                  required
                >
                  <input
                    id={`contact_name_${index}`}
                    type="text"
                    placeholder="e.g. Miriam Cohen"
                    className={inputCls(!!ce?.contact_name)}
                    {...register(`contacts.${index}.contact_name`)}
                    defaultValue={field.contact_name}
                  />
                </FieldWrapper>

                {/* Relationship */}
                <FieldWrapper
                  label="Relationship"
                  htmlFor={`relationship_${index}`}
                  error={ce?.relationship?.message}
                  required
                >
                  <select
                    id={`relationship_${index}`}
                    className={selectCls(!!ce?.relationship)}
                    {...register(`contacts.${index}.relationship`)}
                    defaultValue={field.relationship}
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
                  htmlFor={`contact_phone_${index}`}
                  error={ce?.phone?.message}
                  required
                >
                  <input
                    id={`contact_phone_${index}`}
                    type="tel"
                    placeholder="e.g. 050-1234567"
                    className={inputCls(!!ce?.phone)}
                    {...register(`contacts.${index}.phone`)}
                    defaultValue={field.phone}
                  />
                </FieldWrapper>

                {/* Email */}
                <FieldWrapper
                  label="Email"
                  htmlFor={`contact_email_${index}`}
                  error={ce?.email?.message}
                >
                  <input
                    id={`contact_email_${index}`}
                    type="email"
                    placeholder="e.g. miriam@email.com"
                    className={inputCls(!!ce?.email)}
                    {...register(`contacts.${index}.email`)}
                    defaultValue={field.email}
                  />
                </FieldWrapper>

                {/* Emergency Contact checkbox — full width */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`is_emergency_${index}`}
                    className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <input
                      id={`is_emergency_${index}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      {...register(`contacts.${index}.is_emergency_contact`)}
                      defaultChecked={field.is_emergency_contact}
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
    </AccordionSection>
  );
}
