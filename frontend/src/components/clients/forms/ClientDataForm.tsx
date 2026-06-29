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
import { calculateTabProgress } from "@/utils/profileValidation";
import QuickGlanceBanner from "@/components/clients/dashboard/QuickGlanceBanner";

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

interface ClientDataFormProps {
  client: ClientDoc;
  isEditable: boolean;
  activeTab?: ClientDataFormTabId;
  onActiveTabChange?: (tabId: ClientDataFormTabId) => void;
  onBack?: () => void;
}

function getTabProgressColor(percentage: number): string {
  if (percentage < 30) return "#ef4444";
  if (percentage < 60) return "#f97316";
  if (percentage < 85) return "#eab308";
  return "#22c55e";
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
      <QuickGlanceBanner client={client} isEditMode={true} />

      <nav
        aria-label="Client profile sections"
        className="overflow-x-auto rounded-2xl border border-white/80 bg-[#FFFDF8] p-2 shadow-[0_10px_25px_rgba(44,105,117,0.06)]"
      >
        <ol role="tablist" className="flex min-w-max gap-1.5">
          {CLIENT_DATA_FORM_TABS.map((tab) => {
            const isActive = tab.id === resolvedActiveTab;
            
            const progressCategory = tab.id === "profile" ? "profileAndDemographics" :
                                     tab.id === "legal" ? "legalConsents" :
                                     tab.id;
            
            const progress = calculateTabProgress(client as unknown as Record<string, unknown>, progressCategory);
            
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
                    "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] flex items-center gap-2",
                    isActive
                      ? "bg-[#DCEBEF] text-[#245C66] ring-1 ring-[#C9DDE1]"
                      : "text-[#607B80] hover:bg-[#EEF4EC] hover:text-[#31585F]",
                  ].join(" ")}
                >
                  {tab.label}
                  {progressCategory !== "documents" && (
                    <span 
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${isActive ? 'bg-white/50' : 'bg-[#E4ECE2]'}`}
                      style={{ color: getTabProgressColor(progress) }}
                    >
                      {progress}%
                    </span>
                  )}
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
