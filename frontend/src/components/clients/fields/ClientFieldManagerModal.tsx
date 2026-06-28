"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createClientFieldDefinition,
  getAllClientFieldDefinitionsForAdmin,
  hideClientFieldDefinition,
  reactivateClientFieldDefinition,
  softDeleteClientFieldDefinition,
  updateClientFieldDefinition,
} from "@/firebase/clientFieldDefinitionsService";
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TABS,
  type ClientFieldDefinition,
  type CustomFieldTab,
  type CustomFieldType,
} from "@/schema/customFieldSchema";

const TAB_LABELS: Record<CustomFieldTab, string> = {
  profile: "Profile & Demographics",
  medical: "Medical",
  contacts: "Contacts",
  questionnaire: "Questionnaire",
  legal_consents: "Legal Consents",
  documents: "Documents",
};

interface ClientFieldManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function humanizeType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClientFieldManagerModal({
  isOpen,
  onClose,
}: ClientFieldManagerModalProps) {
  const [definitions, setDefinitions] = useState<ClientFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<ClientFieldDefinition | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [tab, setTab] = useState<CustomFieldTab>("profile");
  const [optionsText, setOptionsText] = useState("");

  const visibleDefinitions = useMemo(
    () => definitions.filter((definition) => definition.hiddenFromManager !== true),
    [definitions],
  );

  const groupedDefinitions = useMemo(
    () =>
      CUSTOM_FIELD_TABS.map((tabId) => ({
        tab: tabId,
        label: TAB_LABELS[tabId],
        active: visibleDefinitions.filter(
          (definition) => definition.active && definition.tab === tabId,
        ),
        inactive: visibleDefinitions.filter(
          (definition) => !definition.active && definition.tab === tabId,
        ),
      })),
    [visibleDefinitions],
  );

  function resetFieldForm() {
    setEditingField(null);
    setLabel("");
    setType("text");
    setTab("profile");
    setOptionsText("");
  }

  function startEditing(field: ClientFieldDefinition) {
    setEditingField(field);
    setLabel(field.label);
    setType(field.type);
    setTab(field.tab);
    setOptionsText(field.options.join("\n"));
  }

  async function loadDefinitions() {
    setIsLoading(true);
    try {
      const data = await getAllClientFieldDefinitionsForAdmin();
      setDefinitions(data);
    } catch (error) {
      console.error("[ClientFieldManagerModal] load failed:", error);
      toast.error("Failed to load client fields.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timeoutId = window.setTimeout(() => {
        void loadDefinitions();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isOpen]);

  async function handleSubmitField(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      toast.error("Field label is required.");
      return;
    }

    const options = optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if ((!editingField && type === "select" && options.length === 0) || (editingField?.type === "select" && options.length === 0)) {
      toast.error("Select fields need at least one option.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingField) {
        await updateClientFieldDefinition(editingField.id, {
          label: trimmedLabel,
          tab,
          options: editingField.type === "select" ? options : [],
        });
        toast.success("Custom field updated.");
      } else {
        await createClientFieldDefinition({
          label: trimmedLabel,
          type,
          tab,
          options,
        });
        toast.success("Custom field added.");
      }
      resetFieldForm();
      await loadDefinitions();
    } catch (error) {
      console.error("[ClientFieldManagerModal] save failed:", error);
      toast.error(editingField ? "Failed to update custom field." : "Failed to add custom field.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(field: ClientFieldDefinition) {
    if (!field.isCustom || !field.active) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate "${field.label}"? Existing client values will stay saved in Firestore.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(field.id);
    try {
      await softDeleteClientFieldDefinition(field.id);
      await loadDefinitions();
      toast.success("Custom field deactivated.");
    } catch (error) {
      console.error("[ClientFieldManagerModal] deactivate failed:", error);
      toast.error("Failed to deactivate custom field.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReactivate(field: ClientFieldDefinition) {
    if (!field.isCustom || field.active) {
      return;
    }

    setReactivatingId(field.id);
    try {
      await reactivateClientFieldDefinition(field.id);
      await loadDefinitions();
      toast.success("Custom field reactivated.");
    } catch (error) {
      console.error("[ClientFieldManagerModal] reactivate failed:", error);
      toast.error("Failed to reactivate custom field.");
    } finally {
      setReactivatingId(null);
    }
  }

  async function handleHide(field: ClientFieldDefinition) {
    if (!field.isCustom || field.active) {
      return;
    }

    const confirmed = window.confirm(
      `Hide "${field.label}" from this list? The field definition and client values will stay in Firestore.`,
    );

    if (!confirmed) {
      return;
    }

    setHidingId(field.id);
    try {
      await hideClientFieldDefinition(field.id);
      await loadDefinitions();
      toast.success("Custom field hidden from the manager list.");
    } catch (error) {
      console.error("[ClientFieldManagerModal] hide failed:", error);
      toast.error("Failed to hide custom field.");
    } finally {
      setHidingId(null);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.28)]">
        <header className="flex flex-col gap-3 border-b border-[#D7E3D5] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A8589]">
              Client fields
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#15383E]">
              Manage custom fields
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[#607B80]">
              Add, edit, deactivate, reactivate, or hide custom fields without deleting stored client values.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-full border border-[#B9CFCA] bg-white px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0]"
          >
            Close
          </button>
        </header>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-5">
            <form
              onSubmit={handleSubmitField}
              className="rounded-2xl border border-[#D7E3D5] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#15383E]">
                    {editingField ? "Edit custom field" : "Add custom field"}
                  </h3>
                  {editingField && (
                    <p className="mt-1 text-xs font-medium text-[#6A8589]">
                      Field type is locked to protect existing values.
                    </p>
                  )}
                </div>
                {editingField && (
                  <button
                    type="button"
                    onClick={resetFieldForm}
                    className="rounded-full border border-[#B9CFCA] px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC]"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">Label</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    maxLength={80}
                    className="mt-1 w-full rounded-xl border border-[#BFD0CA] bg-white px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
                    placeholder="e.g. Preferred contact time"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">Type</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as CustomFieldType)}
                    disabled={Boolean(editingField)}
                    className="mt-1 w-full rounded-xl border border-[#BFD0CA] bg-white px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
                  >
                    {CUSTOM_FIELD_TYPES.map((fieldType) => (
                      <option key={fieldType} value={fieldType}>
                        {humanizeType(fieldType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">Target tab</span>
                  <select
                    value={tab}
                    onChange={(event) => setTab(event.target.value as CustomFieldTab)}
                    className="mt-1 w-full rounded-xl border border-[#BFD0CA] bg-white px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
                  >
                    {CUSTOM_FIELD_TABS.map((tabId) => (
                      <option key={tabId} value={tabId}>
                        {TAB_LABELS[tabId]}
                      </option>
                    ))}
                  </select>
                </label>

                {(editingField?.type === "select" || (!editingField && type === "select")) && (
                  <label className="block">
                    <span className="text-sm font-semibold text-[#31585F]">
                      Options
                    </span>
                    <textarea
                      value={optionsText}
                      onChange={(event) => setOptionsText(event.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-y rounded-xl border border-[#BFD0CA] bg-white px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
                      placeholder={"One option per line\nMorning\nAfternoon\nEvening"}
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#245C66] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? editingField
                      ? "Saving..."
                      : "Adding..."
                    : editingField
                      ? "Save changes"
                      : "Add custom field"}
                </button>
              </div>
            </form>
          </div>

          <section className="rounded-2xl border border-[#D7E3D5] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#15383E]">Custom fields</h3>
              {isLoading && (
                <span className="text-xs font-semibold text-[#6A8589]">Loading...</span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {visibleDefinitions.length === 0 && !isLoading && (
                <p className="rounded-xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] px-4 py-6 text-center text-sm font-medium text-[#607B80]">
                  No custom fields yet.
                </p>
              )}

              {groupedDefinitions.map((group) => {
                if (group.active.length === 0 && group.inactive.length === 0) {
                  return null;
                }

                return (
                  <div key={group.tab} className="space-y-3 border-t border-[#D7E3D5] pt-4 first:border-t-0 first:pt-0">
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A8589]">
                      {group.label}
                    </h4>

                    {group.active.map((field) => (
                      <article
                        key={field.id}
                        className="rounded-xl border border-[#D7E3D5] bg-[#F7FAF5] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-bold text-[#15383E]">{field.label}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6A8589]">
                              {humanizeType(field.type)}
                            </p>
                            {field.type === "select" && field.options.length > 0 && (
                              <p className="mt-2 text-xs leading-5 text-[#607B80]">
                                {field.options.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(field)}
                              className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivate(field)}
                              disabled={deletingId === field.id}
                              className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === field.id ? "Deactivating..." : "Deactivate"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}

                    {group.inactive.map((field) => (
                      <article
                        key={field.id}
                        className="rounded-xl border border-[#E4ECE2] bg-[#F8F7F0] px-4 py-3 opacity-90"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-[#607B80]">{field.label}</p>
                            <p className="mt-0.5 text-xs text-[#8BA0A3]">
                              {humanizeType(field.type)} · Inactive
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(field)}
                              className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReactivate(field)}
                              disabled={reactivatingId === field.id}
                              className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reactivatingId === field.id ? "Reactivating..." : "Reactivate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHide(field)}
                              disabled={hidingId === field.id}
                              className="rounded-full border border-[#D7E3D5] bg-white px-3 py-1.5 text-xs font-bold text-[#6A8589] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {hidingId === field.id ? "Hiding..." : "Remove"}
                            </button>
                          </div>
                        </div>
                      </article>

                      
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
