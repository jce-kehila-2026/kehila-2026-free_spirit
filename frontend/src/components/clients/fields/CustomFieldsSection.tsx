"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldValues, Path, RegisterOptions, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { getActiveClientFieldDefinitions } from "@/firebase/clientFieldDefinitionsService";
import { updateClientDoc } from "@/firebase/clientDbService";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import type {
  ClientFieldDefinition,
  CustomFields,
  CustomFieldValue,
  CustomFieldTab,
} from "@/schema/customFieldSchema";

interface CustomFieldsSectionProps<TFormValues extends FieldValues> {
  tab: CustomFieldTab;
  form?: UseFormReturn<TFormValues>;
  client?: ClientDoc;
  isEditable?: boolean;
}

type CustomFieldsFormData = {
  custom_fields: CustomFields;
};

type StandaloneCustomFieldPath = `custom_fields.${string}`;

type CustomFieldRegisterOptions = {
  setValueAs?: (value: unknown) => CustomFieldValue;
};

const VIEW_CLS = "w-full border-0 bg-transparent px-0 py-1 text-sm text-slate-800 outline-none";

function inputCls() {
  return [
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400 transition-colors duration-150 hover:border-slate-400",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
  ].join(" ");
}

function textareaCls() {
  return [
    "w-full min-h-[88px] resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400 transition-colors duration-150 hover:border-slate-400",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
  ].join(" ");
}

function selectCls() {
  return [
    "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "transition-colors duration-150 hover:border-slate-400 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
  ].join(" ");
}

export default function CustomFieldsSection<TFormValues extends FieldValues>({
  tab,
  form,
  client,
  isEditable = true,
}: CustomFieldsSectionProps<TFormValues>) {
  const [definitions, setDefinitions] = useState<ClientFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const standaloneForm = useForm<CustomFieldsFormData>({
    defaultValues: {
      custom_fields: client?.custom_fields ?? {},
    },
  });
  const shouldUseStandaloneSave = !form && Boolean(client);
  const registerCustomField = (
    fieldPath: Path<TFormValues>,
    standaloneFieldPath: `custom_fields.${string}`,
    options?: CustomFieldRegisterOptions,
  ) =>
    form
      ? form.register(fieldPath, options as Parameters<typeof form.register>[1])
      : standaloneForm.register(
          standaloneFieldPath,
          options as RegisterOptions<CustomFieldsFormData, StandaloneCustomFieldPath>,
        );

  useEffect(() => {
    let shouldIgnore = false;

    async function loadDefinitions() {
      setIsLoading(true);
      try {
        const data = await getActiveClientFieldDefinitions();
        if (!shouldIgnore) {
          setDefinitions(data.filter((definition) => definition.tab === tab));
        }
      } catch (error) {
        console.error("[CustomFieldsSection] load failed:", error);
        if (!shouldIgnore) {
          setDefinitions([]);
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadDefinitions();

    return () => {
      shouldIgnore = true;
    };
  }, [tab]);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Loading custom fields...</p>
      </section>
    );
  }

  if (definitions.length === 0) {
    return null;
  }

  async function handleStandaloneSubmit(data: CustomFieldsFormData) {
    if (!client) {
      return;
    }

    setIsSaving(true);
    const mergedData = {
      custom_fields: {
        ...(client.custom_fields ?? {}),
        ...(data.custom_fields ?? {}),
      },
    };

    try {
      await updateClientDoc(client.id, mergedData);
      standaloneForm.reset(mergedData);
      toast.success("Custom fields saved successfully.");
    } catch (error) {
      console.error("[CustomFieldsSection] save failed:", error);
      toast.error("Failed to save custom fields.");
    } finally {
      setIsSaving(false);
    }
  }

  const content = (
    <>
      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-800">Additional information</h3>
        <p className="mt-1 text-sm text-slate-500">
          Custom fields configured by administrators.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {definitions.map((field) => {
          const fieldPath = `custom_fields.${field.id}` as Path<TFormValues>;
          const standaloneFieldPath = `custom_fields.${field.id}` as const;

          if (field.type === "textarea") {
            return (
              <label key={field.id} className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                <textarea
                  readOnly={!isEditable}
                  className={isEditable ? textareaCls() : VIEW_CLS}
                  {...registerCustomField(fieldPath, standaloneFieldPath)}
                />
              </label>
            );
          }

          if (field.type === "select") {
            return (
              <label key={field.id} className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                <select
                  disabled={!isEditable}
                  className={isEditable ? selectCls() : VIEW_CLS}
                  {...registerCustomField(fieldPath, standaloneFieldPath)}
                >
                  <option value="">Select option...</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (field.type === "checkbox") {
            return (
              <label
                key={field.id}
                className={[
                  "flex items-center gap-3 rounded-lg border px-4 py-3",
                  isEditable ? "border-slate-200 bg-slate-50" : "border-transparent bg-transparent px-0",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  disabled={!isEditable}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  {...registerCustomField(fieldPath, standaloneFieldPath)}
                />
                <span className="text-sm font-semibold text-slate-700">{field.label}</span>
              </label>
            );
          }

          return (
            <label key={field.id} className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">{field.label}</span>
              <input
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                readOnly={!isEditable}
                className={isEditable ? inputCls() : VIEW_CLS}
                {...registerCustomField(fieldPath, standaloneFieldPath, {
                  setValueAs:
                    field.type === "number"
                      ? (value: unknown) => {
                          if (value === "" || value === undefined) {
                            return null;
                          }

                          const parsed = Number(value);
                          return Number.isNaN(parsed) ? null : parsed;
                        }
                      : undefined,
                })}
              />
            </label>
          );
        })}
      </div>

      {shouldUseStandaloneSave && isEditable && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Values are saved under the client&apos;s custom fields.
          </p>
          <button
            type="button"
            onClick={standaloneForm.handleSubmit(handleStandaloneSubmit)}
            disabled={isSaving || !standaloneForm.formState.isDirty}
            className={[
              "rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors",
              isSaving || !standaloneForm.formState.isDirty
                ? "cursor-not-allowed bg-indigo-300"
                : "bg-indigo-600 hover:bg-indigo-700",
            ].join(" ")}
          >
            {isSaving ? "Saving..." : "Save custom fields"}
          </button>
        </div>
      )}
    </>
  );

  if (shouldUseStandaloneSave) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {content}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {content}
    </section>
  );
}
