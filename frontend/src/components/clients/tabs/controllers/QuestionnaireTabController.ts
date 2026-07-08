import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

// Tier 3 Imports (Business Rules)
import { questionnaireSchema } from "@/schema/supplementarySchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// Tier 4 Imports (Database Layer)
import { updateClientDoc } from "@/firebase/clientDbService";

// ─── Tab-level form schema ────────────────────────────────────────────────────
const questionnaireTabSchema = z.object({
  questionnaire: questionnaireSchema,
});
export type QuestionnaireTabFormData = z.infer<typeof questionnaireTabSchema>;

function getQuestionnaireDefaultValues(client: ClientDoc): QuestionnaireTabFormData {
  return {
    questionnaire: {
      talents_and_skills:     client.questionnaire?.talents_and_skills     ?? "",
      community_contribution: client.questionnaire?.community_contribution ?? "",
      ideal_roommate:         client.questionnaire?.ideal_roommate         ?? "",
      favorite_foods:         client.questionnaire?.favorite_foods         ?? "",
      desired_activities:     client.questionnaire?.desired_activities     ?? "",
      program_worries:        client.questionnaire?.program_worries        ?? "",
      main_goals:             client.questionnaire?.main_goals             ?? "",
      personal_challenge:     client.questionnaire?.personal_challenge     ?? "",
      staff_assistance:       client.questionnaire?.staff_assistance       ?? "",
      main_strengths:         client.questionnaire?.main_strengths         ?? "",
      passions:               client.questionnaire?.passions               ?? "",
      dream_jobs:             client.questionnaire?.dream_jobs             ?? "",
    },
  };
}

/**
 * Tier 2: Application Controller for the Questionnaire Tab.
 * Manages form state, validation side-effects, and database submissions.
 */
export function useQuestionnaireTabController(client: ClientDoc) {
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState({ identity: false, program: false, goals: false });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // 1. Initialize Form Engine
  const form = useForm<QuestionnaireTabFormData>({
    resolver: zodResolver(questionnaireTabSchema),
    mode: "onTouched",
    defaultValues: getQuestionnaireDefaultValues(client),
  });

  // 1.5 Sync External Updates (from other tabs)
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(getQuestionnaireDefaultValues(client));
    }
  }, [client, form, form.formState.isDirty]);

  const { errors } = form.formState;
  const qe = errors.questionnaire;

  // 2. Error Listeners (Auto-open accordions if a field fails validation)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (qe?.talents_and_skills || qe?.main_strengths || qe?.passions || qe?.dream_jobs) {
        setOpen((prev) => ({ ...prev, identity: true }));
      }
      if (qe?.community_contribution || qe?.ideal_roommate || qe?.favorite_foods || qe?.desired_activities) {
        setOpen((prev) => ({ ...prev, program: true }));
      }
      if (qe?.main_goals || qe?.personal_challenge || qe?.program_worries || qe?.staff_assistance) {
        setOpen((prev) => ({ ...prev, goals: true }));
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    qe?.talents_and_skills, qe?.main_strengths, qe?.passions, qe?.dream_jobs,
    qe?.community_contribution, qe?.ideal_roommate, qe?.favorite_foods, qe?.desired_activities,
    qe?.main_goals, qe?.personal_challenge, qe?.program_worries, qe?.staff_assistance,
  ]);

  // 3. Save Handler (Bridges to Tier 4)
  async function onSubmit(data: QuestionnaireTabFormData) {
    setIsSaving(true);
    try {
      // updateClientDoc inherently strips undefined values so no local sanitize is needed!
      await updateClientDoc(client.id, {
        questionnaire: data.questionnaire
      });
      form.reset(data); // Resets isDirty state
      toast.success("Questionnaire saved successfully.");
    } catch (err) {
      console.error("[QuestionnaireTabController] Update failed:", err);
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