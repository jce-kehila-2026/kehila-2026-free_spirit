import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

// Tier 3 Imports (Business Rules)
import { legalConsentsSchema } from "@/schema/supplementarySchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

// ─── Tab-level form schema ────────────────────────────────────────────────────
const legalConsentsTabSchema = z.object({
  legal_consents: legalConsentsSchema,
});
export type LegalConsentsTabFormData = z.infer<typeof legalConsentsTabSchema>;

function getLegalConsentsDefaultValues(client: ClientDoc): LegalConsentsTabFormData {
  const lc = client.legal_consents;
  return {
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
  };
}

/**
 * Tier 2: Application Controller for the Legal Consents Tab.
 * Manages form state, string arrays, validation side-effects, and DB saves.
 */
export function useLegalConsentsTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState({ release: false, waiver: false });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 1. Initialize Form Engine
  const form = useForm<LegalConsentsTabFormData>({
    resolver: zodResolver(legalConsentsTabSchema),
    mode: "onTouched",
    defaultValues: getLegalConsentsDefaultValues(client),
  });

  // 1.5 Sync External Updates (from other tabs)
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(getLegalConsentsDefaultValues(client));
    }
  }, [client, form, form.formState.isDirty]);

  // 2. Dynamic Arrays (React Hook Form requires 'as never' for primitive arrays)
  const agenciesArray = useFieldArray({
    control: form.control,
    name: "legal_consents.authorized_agencies" as never,
  });

  const signaturesArray = useFieldArray({
    control: form.control,
    name: "legal_consents.visit_waiver_signatures" as never,
  });

  const { errors } = form.formState;
  const le = errors.legal_consents;

  // 3. Error Listeners (Auto-open accordions)
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

  // 4. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: LegalConsentsTabFormData) {
    setIsSaving(true);
    try {
      await updateClientDoc(client.id, {
        legal_consents: data.legal_consents
      });
      form.reset(data); // Resets isDirty
      toast.success("Legal consents saved successfully.");
    } catch (err) {
      console.error("[LegalConsentsTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // 5. Expose strictly what the UI Layer needs
  return {
    form,
    accordions: {
      open,
      toggle: toggleSection,
    },
    arrays: {
      agencies: agenciesArray,
      signatures: signaturesArray,
    },
    submission: {
      isSaving,
      onSubmit,
    },
  };
}