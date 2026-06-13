import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

// Tier 3 Imports (Business Rules)
import { logisticsSchema } from "@/schema/supplementarySchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

// ─── Tab-level form schema ────────────────────────────────────────────────────
const logisticsTabSchema = z.object({
  date_of_entry:    z.string().optional().or(z.literal("")),
  purpose_of_visit: z.string().trim().max(500).optional().or(z.literal("")),
  logistics:        logisticsSchema,
});
export type LogisticsTabFormData = z.infer<typeof logisticsTabSchema>;

/**
 * Tier 2: Application Controller for the Logistics Tab.
 * Manages form state, validation side-effects, and database submissions.
 */
export function useLogisticsTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState({ travel: false, insurance: false, program: false });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 1. Initialize Form Engine
  const form = useForm<LogisticsTabFormData>({
    resolver: zodResolver(logisticsTabSchema),
    mode: "onTouched",
    defaultValues: {
      date_of_entry:    client.date_of_entry    ?? "",
      purpose_of_visit: client.purpose_of_visit ?? "",
      logistics: {
        insurance_agent_name:   client.logistics?.insurance_agent_name   ?? "",
        insurance_agent_number: client.logistics?.insurance_agent_number ?? "",
        insurance_period_start: client.logistics?.insurance_period_start ?? "",
        insurance_period_end:   client.logistics?.insurance_period_end   ?? "",
        program_consultant:     client.logistics?.program_consultant     ?? "",
        program_start_date:     client.logistics?.program_start_date     ?? "",
      },
    },
  });

  const { errors } = form.formState;
  const le = errors.logistics;

  // 2. Error Listeners (Auto-open accordions if a field fails validation)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.date_of_entry || errors.purpose_of_visit) {
        setOpen((prev) => ({ ...prev, travel: true }));
      }
      if (
        le?.insurance_agent_name ||
        le?.insurance_agent_number ||
        le?.insurance_period_start ||
        le?.insurance_period_end
      ) {
        setOpen((prev) => ({ ...prev, insurance: true }));
      }
      if (le?.program_consultant || le?.program_start_date) {
        setOpen((prev) => ({ ...prev, program: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    errors.date_of_entry,
    errors.purpose_of_visit,
    le?.insurance_agent_name,
    le?.insurance_agent_number,
    le?.insurance_period_start,
    le?.insurance_period_end,
    le?.program_consultant,
    le?.program_start_date,
  ]);

  // 3. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: LogisticsTabFormData) {
    setIsSaving(true);
    try {
      // updateClientDoc inherently strips undefined values so no local sanitize is needed!
      // This spreads date_of_entry, purpose_of_visit, and logistics into the root of the document
      await updateClientDoc(client.id, { ...data });
      form.reset(data); // Resets isDirty state
      toast.success("Logistics saved successfully.");
    } catch (err) {
      console.error("[LogisticsTabController] Update failed:", err);
      toast.error("Failed to save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // 4. Expose strictly what the UI Layer needs
  return {
    form,
    accordions: {
      open,
      toggle: toggleSection,
    },
    submission: {
      isSaving,
      onSubmit,
    },
  };
}