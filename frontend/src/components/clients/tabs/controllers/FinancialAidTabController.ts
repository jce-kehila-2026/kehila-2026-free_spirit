import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Tier 3 Imports (Business Rules)
import { 
  financialAidTabSchema, 
  type FinancialAidTabFormData, 
  type FinancialAidApplication, 
  type PaymentInstallment 
} from "@/schema/financialAidSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

export const EMPTY_APPLICATION: FinancialAidApplication = {
  status: "pending",
  requested_amount: undefined,
  awarded_amount: undefined,
  application_date: "",
  review_notes: "",
  financial_aid_parent_names: "",
  financial_aid_circumstances: "",
  payment_installments: [],
};

export const EMPTY_INSTALLMENT: PaymentInstallment = {
  amount: 0,
  due_date: "",
  status: "",
};

/** Strips undefined/empty string values before sending to the DB */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeItem(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return [k, v.map((item) => typeof item === "object" ? sanitizeItem(item) : item)];
        }
        if (v !== null && typeof v === "object") {
          return [k, sanitizeItem(v)];
        }
        return [k, v];
      })
  );
}

/**
 * Tier 2: Application Controller for the Financial Aid Tab.
 * Manages double-nested form arrays, live status badges, and database saving.
 */
export function useFinancialAidTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialize Form Engine
  const form = useForm<FinancialAidTabFormData>({
    resolver: zodResolver(financialAidTabSchema),
    mode: "onTouched",
    defaultValues: {
      financial_aid_applications: (client.financial_aid_applications ?? []).map((app) => ({
        status: app.status ?? "pending",
        requested_amount: app.requested_amount,
        awarded_amount: app.awarded_amount,
        application_date: app.application_date ?? "",
        review_notes: app.review_notes ?? "",
        financial_aid_parent_names: app.financial_aid_parent_names ?? "",
        financial_aid_circumstances: app.financial_aid_circumstances ?? "",
        payment_installments: (app.payment_installments ?? []).map((inst) => ({
          amount: inst.amount ?? 0,
          due_date: inst.due_date ?? "",
          status: inst.status ?? "",
        })),
      })),
    },
  });

  // 2. Initialize Main Applications Array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "financial_aid_applications",
  });

  // 3. Live Tracking (Drives the UI status badges in real-time)
  const watchedStatuses = useWatch({
    control: form.control,
    name: "financial_aid_applications",
  });

  // 4. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: FinancialAidTabFormData) {
    setIsSaving(true);
    try {
      // Clean the array payload before sending to Tier 4 DB Layer
      const sanitizedPayload = data.financial_aid_applications.map((app) =>
        sanitizeItem(app as Record<string, unknown>)
      );

      await updateClientDoc(client.id, {
        financial_aid_applications: sanitizedPayload
      });
      
      form.reset(data); // Resets isDirty
      toast.success("Financial aid applications saved successfully.");
    } catch (err) {
      console.error("[FinancialAidTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // 5. Expose strictly what the UI Layer needs
  return {
    form,
    applications: {
      fields,
      append,
      remove,
      watchedStatuses,
    },
    submission: {
      isSaving,
      onSubmit,
    },
  };
}