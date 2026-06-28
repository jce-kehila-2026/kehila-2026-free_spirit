"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";
import MedicalTab from "@/components/clients/tabs/MedicalTab";
import ContactsTab from "@/components/clients/tabs/ContactsTab";
import DocumentsTab from "@/components/clients/tabs/DocumentsTab";

import QuestionnaireTab from "@/components/clients/tabs/QuestionnaireTab";
import LegalConsentsTab from "@/components/clients/tabs/LegalConsentsTab";

export const CLIENT_DATA_FORM_TABS = [
  { id: "profile", label: "Profile & Demographics" },
  { id: "medical", label: "Medical" },
  { id: "contacts", label: "Contacts" },

  { id: "questionnaire", label: "Questionnaire" },
  { id: "legal", label: "Legal Consents" },
  { id: "documents", label: "Documents" },
] as const;

export type ClientDataFormTabId = (typeof CLIENT_DATA_FORM_TABS)[number]["id"];

interface BaseTabProps {
  client: ClientDoc;
  isEditable?: boolean;
  onBack?: () => void;
}

const TAB_COMPONENTS: Record<ClientDataFormTabId, ComponentType<BaseTabProps>> = {
  profile: ProfileTab as ComponentType<BaseTabProps>,
  medical: MedicalTab as ComponentType<BaseTabProps>,
  contacts: ContactsTab as ComponentType<BaseTabProps>,

  questionnaire: QuestionnaireTab as ComponentType<BaseTabProps>,
  legal: LegalConsentsTab as ComponentType<BaseTabProps>,
  documents: DocumentsTab as ComponentType<BaseTabProps>,
};

const PROFILE_COMPLETION_KEYS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "passport_id",
  "gender",
  "address",
  "dob",
  "referrer",
  "education_status",
  "diagnosis",
  "passport_country",
  "citizenship",
  "home_address",
  "household_members",
  "dependents",
] as const;

interface ClientDataFormProps {
  client: ClientDoc;
  isEditable: boolean;
  activeTab?: ClientDataFormTabId;
  onActiveTabChange?: (tabId: ClientDataFormTabId) => void;
  onBack?: () => void;
}

function hasFilledValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(hasFilledValue);
  }

  return false;
}

function isTabComplete(client: ClientDoc, tabId: ClientDataFormTabId): boolean {
  switch (tabId) {
    case "profile":
      return PROFILE_COMPLETION_KEYS.some((key) => hasFilledValue(client[key]));
    case "medical":
      return hasFilledValue(client.medical_profile);
    case "contacts":
      return hasFilledValue(client.contacts);

    case "questionnaire":
      return hasFilledValue(client.questionnaire);
    case "legal":
      return hasFilledValue(client.legal_consents);
    case "documents":
      return hasFilledValue(client.client_documents);
  }
}

/**
 * Shared client data form shell.
 *
 * This component owns only the tab navigation and tab rendering surface. The
 * individual tab controllers keep their existing validation and Firestore save
 * behavior, allowing the manager edit view and client onboarding route to reuse
 * the exact same form implementation.
 */
export default function ClientDataForm({
  client,
  isEditable,
  activeTab,
  onActiveTabChange,
  onBack,
}: ClientDataFormProps) {
  const [internalActiveTab, setInternalActiveTab] =
    useState<ClientDataFormTabId>("profile");
  const resolvedActiveTab = activeTab ?? internalActiveTab;
  const activeTabIndex = CLIENT_DATA_FORM_TABS.findIndex(
    (tab) => tab.id === resolvedActiveTab,
  );
  const ActiveTabContent = TAB_COMPONENTS[resolvedActiveTab];
  const completedTabCount = CLIENT_DATA_FORM_TABS.filter((tab) =>
    isTabComplete(client, tab.id),
  ).length;
  const completionPercentage = Math.round(
    (completedTabCount / CLIENT_DATA_FORM_TABS.length) * 100,
  );
  const isFirstTab = activeTabIndex <= 0;
  const isLastTab = activeTabIndex === CLIENT_DATA_FORM_TABS.length - 1;

  function handleTabChange(tabId: ClientDataFormTabId) {
    if (onActiveTabChange) {
      onActiveTabChange(tabId);
      return;
    }

    setInternalActiveTab(tabId);
  }

  function handleStepChange(direction: "previous" | "next") {
    const nextIndex = direction === "next" ? activeTabIndex + 1 : activeTabIndex - 1;
    const nextTab = CLIENT_DATA_FORM_TABS[nextIndex];

    if (nextTab) {
      // Reuse the same state path as manual tab clicks so admin and onboarding stay in sync.
      handleTabChange(nextTab.id);
    }
  }

  return (
    <>
      <section
        aria-label="Client data completion"
        className="rounded-2xl border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_10px_25px_rgba(44,105,117,0.06)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#15383E]">
              {completedTabCount} of {CLIENT_DATA_FORM_TABS.length} Tabs Completed
            </p>
            <p className="mt-1 text-xs font-medium text-[#607B80]">
              Completion is calculated from saved client profile data.
            </p>
          </div>
          <p className="text-sm font-bold text-[#2C6975]">{completionPercentage}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E4ECE2]">
          <div
            className="h-full rounded-full bg-[#2C6975] transition-[width] duration-300 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </section>

      <nav
        aria-label="Client profile sections"
        className="overflow-x-auto rounded-2xl border border-white/80 bg-[#FFFDF8] p-2 shadow-[0_10px_25px_rgba(44,105,117,0.06)]"
      >
        <ol role="tablist" className="flex min-w-max gap-1.5">
          {CLIENT_DATA_FORM_TABS.map((tab) => {
            const isActive = tab.id === resolvedActiveTab;
            return (
              <li key={tab.id} role="presentation">
                <button
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={[
                    "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0]",
                    isActive
                      ? "bg-[#DCEBEF] text-[#245C66] ring-1 ring-[#C9DDE1]"
                      : "text-[#607B80] hover:bg-[#EEF4EC] hover:text-[#31585F]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <fieldset className="min-w-0 rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_14px_34px_rgba(44,105,117,0.08)] sm:p-6">
        <div
          role="tabpanel"
          id={`tabpanel-${resolvedActiveTab}`}
          aria-labelledby={`tab-${resolvedActiveTab}`}
        >
          <ActiveTabContent
            client={client}
            isEditable={isEditable}
            onBack={resolvedActiveTab === "profile" ? onBack : undefined}
          />
        </div>
      </fieldset>

      <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_10px_25px_rgba(44,105,117,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => handleStepChange("previous")}
          disabled={isFirstTab}
          className="inline-flex items-center justify-center rounded-full border border-[#B9CFCA] bg-white px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          &larr; Back
        </button>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#6A8589]">
          Step {activeTabIndex + 1} of {CLIENT_DATA_FORM_TABS.length}
        </p>
        <button
          type="button"
          onClick={() => handleStepChange("next")}
          disabled={isLastTab}
          className="inline-flex items-center justify-center rounded-full bg-[#245C66] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1E515A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next Step &rarr;
        </button>
      </footer>
    </>
  );
}
