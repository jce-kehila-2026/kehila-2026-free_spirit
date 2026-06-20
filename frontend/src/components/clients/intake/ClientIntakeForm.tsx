"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { clientSchema, type ClientFormInput } from "@/schema/clientSchema";

// TIER 2 — Application Layer
import { useClientManagementService } from "@/application/ClientManagementService";

// TIER 1 — Presentation sub-components
import BasicInfoStep from "./BasicInfoStep";
import ContactsStep from "./ContactsStep";

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_VALUES: ClientFormInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "interested",
  passport_id: "",
  gender: undefined,
  address: "",
  dob: "",
  referrer: "",
  education_status: undefined,
  program_ids: [],
  diagnosis: "",
  personal_notes: "",
  medical_profile: {
    allergies: "",
    medications: "",
    dietary_restrictions: "",
    insurance_company: "",
    policy_number: "",
    medical_clearance_status: undefined,
  },
  contacts: [],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientIntakeFormProps {
  /** Called after a successful save so the parent can switch back to the list view. */
  onSaveSuccess?: () => void;
  /** Called when the user cancels — routes back to the client list without saving. */
  onCancel?: () => void;
}

// ─── Component (Tier 1 — Presentation) ───────────────────────────────────────

/**
 * ClientIntakeForm — lightweight "New Client" intake form.
 *
 * Tier 1 responsibilities only: form state, layout, validation feedback.
 * Contains zero Firebase imports. Delegates all persistence to the
 * Tier 2 application service (useClientManagementService).
 *
 * This component is strictly for creating new clients.
 * Editing existing clients is handled by the Client Profile Dashboard tabs.
 */
export default function ClientIntakeForm({ onSaveSuccess, onCancel }: ClientIntakeFormProps) {
  // ── Tier 2 Application Service ─────────────────────────────────────────
  const { saveNewClient, isSavingNewClient } = useClientManagementService();

  // ── Form engine ────────────────────────────────────────────────────────
  const methods = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { handleSubmit, formState, reset } = methods;

  // ── Submit handler ─────────────────────────────────────────────────────

  async function onSave(data: ClientFormInput) {
    try {
      // Always save as "interested" — status promotion happens elsewhere
      await saveNewClient({ ...data, status: "interested" });
      reset(DEFAULT_VALUES);
      onSaveSuccess?.();
    } catch {
      // Toast error is already shown by the service layer (Tier 2).
      // We intentionally keep the form open so the user can retry.
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <FormProvider {...methods}>
      <div className="mx-auto max-w-2xl">

        {/* ── Header ── */}
        <h2 className="mb-6 text-xl font-bold text-slate-800">
          Basic Information
        </h2>

        <form
          onSubmit={handleSubmit(onSave)}
          onKeyDown={(e) => {
            // Prevent accidental Enter-key submissions inside text inputs
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName !== "TEXTAREA" &&
              (e.target as HTMLElement).tagName !== "BUTTON"
            ) {
              e.preventDefault();
            }
          }}
          noValidate
        >
          {/* ── Basic Info Section ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <BasicInfoStep />
          </div>

          {/* ── Contacts Section ── */}
          <div className="mt-4">
            <ContactsStep />
          </div>

          {/* ── Footer: Cancel + Save ── */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              id="btn-cancel-intake"
              onClick={() => onCancel?.()}
              disabled={isSavingNewClient || formState.isSubmitting}
              className={[
                "rounded-lg border border-slate-200 bg-transparent px-5 py-2.5",
                "text-sm font-semibold text-slate-500",
                "transition-colors hover:border-slate-300 hover:text-slate-700",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                id="btn-save-interested"
                disabled={isSavingNewClient || formState.isSubmitting}
                className={[
                  "shrink-0 rounded-lg border border-slate-300 bg-white px-6 py-2.5",
                  "text-sm font-semibold text-slate-700 shadow-sm",
                  "transition-colors hover:bg-slate-50 hover:border-slate-400",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {isSavingNewClient || formState.isSubmitting
                  ? "Saving…"
                  : "💾 Save as Interested"}
              </button>
            </div>
          </div>
        </form>

      </div>
    </FormProvider>
  );
}
