"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

import {
  clientSchema,
  type ClientFormInput,
} from "@/schemas/clientSchema";

import BasicInfoStep from "./steps/BasicInfoStep";
import DemographicsStep from "./steps/DemographicsStep";
import MedicalProfileStep from "./steps/MedicalProfileStep";
import ContactsStep from "./steps/ContactsStep";

// ─── Step configuration ───────────────────────────────────────────────────────

const STEP_FIELDS: Record<number, FieldPath<ClientFormInput>[]> = {
  1: ["first_name", "last_name", "email", "phone"],
  2: ["passport_id"],
  3: [],
  4: [],
};

const STEPS = [
  { id: 1, label: "Basic Info", component: BasicInfoStep },
  { id: 2, label: "Demographics", component: DemographicsStep },
  { id: 3, label: "Medical Profile", component: MedicalProfileStep },
  { id: 4, label: "Contacts", component: ContactsStep },
] as const;

const TOTAL_STEPS = STEPS.length;

type StepId = (typeof STEPS)[number]["id"];

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_VALUES: ClientFormInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "draft",
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
    physician_name: "",
    physician_phone: "",
    allergies: "",
    medications: "",
    dietary_restrictions: "",
    insurance_company: "",
    policy_number: "",
    medical_clearance_status: undefined,
  },
  contacts: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStepsWithErrors(errors: Record<string, unknown>): string[] {
  const stepLabels: string[] = [];

  if (errors.first_name || errors.last_name || errors.email || errors.phone) {
    stepLabels.push("Step 1 (Basic Info)");
  }
  if (
    errors.passport_id ||
    errors.dob ||
    errors.address ||
    errors.gender ||
    errors.education_status ||
    errors.diagnosis ||
    errors.personal_notes
  ) {
    stepLabels.push("Step 2 (Demographics)");
  }
  if (errors.medical_profile) {
    stepLabels.push("Step 3 (Medical Profile)");
  }
  if (errors.contacts) {
    stepLabels.push("Step 4 (Contacts)");
  }

  return stepLabels;
}

// ─── Props ────────────────────────────────────────────────────────────────────

/** Data shape coming from Firestore (has `id` + possibly `created_at`). */
interface InitialData extends ClientFormInput {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface WizardControllerProps {
  /** If provided, the wizard opens in edit mode with pre-filled data. */
  initialData?: InitialData | null;
  /** Called after a successful save (create or update) so the parent can switch views. */
  onSaveSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WizardController({
  initialData,
  onSaveSuccess,
}: WizardControllerProps) {
  const isEditMode = !!initialData;

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Form engine ────────────────────────────────────────────────────────
  const methods = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { setValue, trigger, handleSubmit, formState, reset } = methods;

  // Reset form when initialData changes (entering/exiting edit mode)
  useEffect(() => {
    if (initialData) {
      // Strip Firestore-only fields before resetting
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, ...formFields } = initialData;
      reset({
        ...DEFAULT_VALUES,
        ...formFields,
        // Ensure nested objects merge correctly
        medical_profile: {
          ...DEFAULT_VALUES.medical_profile,
          ...(formFields.medical_profile ?? {}),
        },
        contacts: formFields.contacts ?? [],
      });
    } else {
      reset(DEFAULT_VALUES);
    }
    setCurrentStep(1);
    setSubmitError(null);
  }, [initialData, reset]);

  // ── Navigation helpers ─────────────────────────────────────────────────
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  async function goNext() {
    const fields = STEP_FIELDS[currentStep];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (valid && !isLastStep) {
      setSubmitError(null);
      setCurrentStep((s) => (s + 1) as StepId);
    }
  }

  function goBack() {
    if (!isFirstStep) {
      setSubmitError(null);
      setCurrentStep((s) => (s - 1) as StepId);
    }
  }

  // ── Firestore save helper ──────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          if (Array.isArray(v)) {
            return [
              k,
              v.map((item) =>
                item !== null &&
                typeof item === "object" &&
                !Array.isArray(item)
                  ? sanitizeForFirestore(item)
                  : item
              ),
            ];
          }
          if (v !== null && typeof v === "object") {
            return [k, sanitizeForFirestore(v)];
          }
          return [k, v];
        })
    );
  }

  async function saveToFirestore(data: ClientFormInput) {
    setIsSaving(true);
    setSubmitError(null);

    try {
      const sanitized = sanitizeForFirestore(data);

      if (isEditMode && initialData) {
        // ── Update existing document ──────────────────────────────────
        const docRef = doc(db, "clients", initialData.id);
        await updateDoc(docRef, {
          ...sanitized,
          updated_at: serverTimestamp(),
        });

        alert(
          `✓ "${data.first_name} ${data.last_name}" updated successfully!`
        );
      } else {
        // ── Create new document ───────────────────────────────────────
        await addDoc(collection(db, "clients"), {
          ...sanitized,
          created_at: serverTimestamp(),
        });

        alert(
          data.status === "interested"
            ? `✓ "${data.first_name} ${data.last_name}" saved as an Interested Contact.`
            : `✓ "${data.first_name} ${data.last_name}" registered successfully!`
        );
      }

      // Notify parent to switch back to list view
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("[WizardController] Firestore write failed:", error);
      setSubmitError(
        "Failed to save the client record. Please check your connection and try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ── Step 1 branching actions ───────────────────────────────────────────

  async function handleSaveAsInterested() {
    setValue("status", "interested");
    const fields = STEP_FIELDS[1];
    const valid = await trigger(fields);
    if (valid) {
      const data = methods.getValues();
      await saveToFirestore({ ...data, status: "interested" });
    }
  }

  async function handleContinueRegistration() {
    setValue("status", "registered");
    const fields = STEP_FIELDS[1];
    const valid = await trigger(fields);
    if (valid) setCurrentStep(2);
  }

  // ── Final submit (Step 4) ──────────────────────────────────────────────

  const onSubmit = async (data: ClientFormInput) => {
    await saveToFirestore(data);
  };

  const onInvalid = () => {
    const errorSteps = getStepsWithErrors(
      formState.errors as unknown as Record<string, unknown>
    );
    if (errorSteps.length > 0) {
      setSubmitError(
        `Please fix errors on previous steps: ${errorSteps.join(", ")}`
      );
    } else {
      setSubmitError("Please fix all validation errors before submitting.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <FormProvider {...methods}>
      <div className="mx-auto max-w-2xl">
        {/* ── Header ── */}
        <h2 className="mb-6 text-xl font-bold text-slate-800">
          {isEditMode
            ? `Editing: ${initialData!.first_name} ${initialData!.last_name}`
            : "New Client Registration"}
        </h2>

        {/* ── Step indicator ── */}
        <nav aria-label="Registration steps" className="mb-8">
          <ol className="flex items-center gap-0">
            {STEPS.map((step, index) => {
              const isDone = step.id < currentStep;
              const isActive = step.id === currentStep;
              const isUpcoming = step.id > currentStep;

              return (
                <li key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      aria-current={isActive ? "step" : undefined}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        isDone && "bg-emerald-500 text-white",
                        isActive &&
                          "bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1",
                        isUpcoming && "bg-slate-200 text-slate-500",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isDone ? "✓" : step.id}
                    </span>
                    <span
                      className={[
                        "text-xs font-medium",
                        isActive && "text-indigo-600",
                        isDone && "text-emerald-600",
                        isUpcoming && "text-slate-400",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={[
                        "mx-2 mb-5 h-0.5 flex-1 transition-colors",
                        isDone ? "bg-emerald-400" : "bg-slate-200",
                      ].join(" ")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Global error banner ── */}
        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {submitError}
          </div>
        )}

        {/* ── Step content card ── */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {currentStep === 1 ? (
              <BasicInfoStep
                onSaveAsInterested={handleSaveAsInterested}
                onContinueRegistration={handleContinueRegistration}
              />
            ) : currentStep === 2 ? (
              <DemographicsStep />
            ) : currentStep === 3 ? (
              <MedicalProfileStep />
            ) : (
              <ContactsStep />
            )}
          </div>

          {/* ── Navigation buttons (Steps 2-4) ── */}
          {currentStep > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                id="wizard-back-btn"
                onClick={goBack}
                disabled={isSaving}
                className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ← Back
              </button>

              {isLastStep ? (
                <button
                  type="submit"
                  id="wizard-submit-btn"
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving…"
                    : isEditMode
                      ? "Update Client"
                      : "Submit Registration"}
                </button>
              ) : (
                <button
                  type="button"
                  id="wizard-next-btn"
                  onClick={goNext}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  );
}
