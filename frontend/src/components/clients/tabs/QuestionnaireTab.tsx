"use client";

import { AccordionSection } from "@/components/ui/AccordionSection";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import CustomFieldsSection from "@/components/clients/fields/CustomFieldsSection";

// Import our Tier 2 Controller
import { useQuestionnaireTabController } from "./controllers/QuestionnaireTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuestionnaireTabProps {
  client: ClientDoc;
  isEditable: boolean;
}

// ─── Shared styling helpers (Pure UI) ─────────────────────────────────────────

function textareaCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[100px]",
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

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

export default function QuestionnaireTab({ client, isEditable }: QuestionnaireTabProps) {
  // Wire up the controller
  const { form, accordions, submission } = useQuestionnaireTabController(client);
  const { register, formState: { errors, isDirty }, handleSubmit } = form;

  const qe = errors.questionnaire;

  return (
    <form onSubmit={handleSubmit(submission.onSubmit)} noValidate>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-6 sm:p-8">

          {/* ════ Section 1: Personal Identity & Strengths ════ */}
          <AccordionSection
            title="Personal Identity & Strengths"
            description="Open-ended answers from the intake questionnaire."
            isOpen={accordions.open.identity}
            onToggle={() => accordions.toggle("identity")}
            hasError={!!(qe?.talents_and_skills || qe?.main_strengths || qe?.passions || qe?.dream_jobs)}
          >
            <div className="grid gap-5">
              <FieldWrapper label="Talents & Skills" htmlFor="q-talents_and_skills" error={qe?.talents_and_skills?.message}>
                <textarea
                  id="q-talents_and_skills" placeholder="What are your special talents or skills?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.talents_and_skills) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.talents_and_skills")}
                />
              </FieldWrapper>

              <FieldWrapper label="Main Strengths" htmlFor="q-main_strengths" error={qe?.main_strengths?.message}>
                <textarea
                  id="q-main_strengths" placeholder="What are your greatest personal strengths?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.main_strengths) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.main_strengths")}
                />
              </FieldWrapper>

              <FieldWrapper label="Passions" htmlFor="q-passions" error={qe?.passions?.message}>
                <textarea
                  id="q-passions" placeholder="What are you most passionate about in life?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.passions) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.passions")}
                />
              </FieldWrapper>

              <FieldWrapper label="Dream Jobs" htmlFor="q-dream_jobs" error={qe?.dream_jobs?.message}>
                <textarea
                  id="q-dream_jobs" placeholder="What jobs or careers have you dreamed of pursuing?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.dream_jobs) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.dream_jobs")}
                />
              </FieldWrapper>
            </div>
          </AccordionSection>

          {/* ════ Section 2: Program Fit & Preferences ════ */}
          <AccordionSection
            title="Program Fit & Preferences"
            description="Answers to help our staff tailor the program experience."
            isOpen={accordions.open.program}
            onToggle={() => accordions.toggle("program")}
            hasError={!!(qe?.community_contribution || qe?.ideal_roommate || qe?.favorite_foods || qe?.desired_activities)}
          >
            <div className="grid gap-5">
              <FieldWrapper label="Community Contribution" htmlFor="q-community_contribution" error={qe?.community_contribution?.message}>
                <textarea
                  id="q-community_contribution" placeholder="How would you like to contribute to the community?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.community_contribution) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.community_contribution")}
                />
              </FieldWrapper>

              <FieldWrapper label="Ideal Roommate" htmlFor="q-ideal_roommate" error={qe?.ideal_roommate?.message}>
                <textarea
                  id="q-ideal_roommate" placeholder="What qualities do you look for in a roommate?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.ideal_roommate) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.ideal_roommate")}
                />
              </FieldWrapper>

              <FieldWrapper label="Favorite Foods" htmlFor="q-favorite_foods" error={qe?.favorite_foods?.message}>
                <textarea
                  id="q-favorite_foods" placeholder="e.g. Hummus, shakshuka, pizza…" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.favorite_foods) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.favorite_foods")}
                />
              </FieldWrapper>

              <FieldWrapper label="Desired Activities" htmlFor="q-desired_activities" error={qe?.desired_activities?.message}>
                <textarea
                  id="q-desired_activities" placeholder="What activities or events would you like to participate in?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.desired_activities) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.desired_activities")}
                />
              </FieldWrapper>
            </div>
          </AccordionSection>

          {/* ════ Section 3: Goals & Support Needs ════ */}
          <AccordionSection
            title="Goals & Support Needs"
            description="What the client hopes to achieve and where they need help."
            isOpen={accordions.open.goals}
            onToggle={() => accordions.toggle("goals")}
            hasError={!!(qe?.main_goals || qe?.personal_challenge || qe?.program_worries || qe?.staff_assistance)}
          >
            <div className="grid gap-5">
              <FieldWrapper label="Main Goals" htmlFor="q-main_goals" error={qe?.main_goals?.message}>
                <textarea
                  id="q-main_goals" placeholder="What are your main goals for the program?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.main_goals) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.main_goals")}
                />
              </FieldWrapper>

              <FieldWrapper label="Personal Challenge" htmlFor="q-personal_challenge" error={qe?.personal_challenge?.message}>
                <textarea
                  id="q-personal_challenge" placeholder="What personal challenge are you working to overcome?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.personal_challenge) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.personal_challenge")}
                />
              </FieldWrapper>

              <FieldWrapper label="Program Worries" htmlFor="q-program_worries" error={qe?.program_worries?.message}>
                <textarea
                  id="q-program_worries" placeholder="Do you have any concerns or worries about the program?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.program_worries) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.program_worries")}
                />
              </FieldWrapper>

              <FieldWrapper label="How Staff Can Assist" htmlFor="q-staff_assistance" error={qe?.staff_assistance?.message}>
                <textarea
                  id="q-staff_assistance" placeholder="How can our staff best support you during the program?" readOnly={!isEditable}
                  className={isEditable ? textareaCls(!!qe?.staff_assistance) : VIEW_TEXTAREA_CLS}
                  {...register("questionnaire.staff_assistance")}
                />
              </FieldWrapper>
            </div>
          </AccordionSection>
        </div>

        {/* ── Sticky footer (edit mode only) ── */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <CustomFieldsSection tab="questionnaire" client={client} isEditable={isEditable} />
        </div>

        {isEditable && (
          <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
            {isDirty ? (
              <p className="text-xs font-medium text-amber-600">You have unsaved changes.</p>
            ) : (
              <p className="text-xs text-slate-400">All changes are saved.</p>
            )}
            <button
              type="submit" id="btn-questionnaire-save" disabled={submission.isSaving || !isDirty}
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
