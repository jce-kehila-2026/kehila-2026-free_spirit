"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";
import MedicalTab from "@/components/clients/tabs/MedicalTab";
import ContactsTab from "@/components/clients/tabs/ContactsTab";
import FinancialAidTab from "@/components/clients/tabs/FinancialAidTab";
import DocumentsTab from "@/components/clients/tabs/DocumentsTab";
import LogisticsTab from "@/components/clients/tabs/LogisticsTab";
import QuestionnaireTab from "@/components/clients/tabs/QuestionnaireTab";
import LegalConsentsTab from "@/components/clients/tabs/LegalConsentsTab";

export const CLIENT_DATA_FORM_TABS = [
  { id: "profile", label: "Profile & Demographics" },
  { id: "medical", label: "Medical" },
  { id: "contacts", label: "Contacts" },
  { id: "logistics", label: "Logistics" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "legal", label: "Legal Consents" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Aid" },
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
  logistics: LogisticsTab as ComponentType<BaseTabProps>,
  questionnaire: QuestionnaireTab as ComponentType<BaseTabProps>,
  legal: LegalConsentsTab as ComponentType<BaseTabProps>,
  documents: DocumentsTab as ComponentType<BaseTabProps>,
  financial: FinancialAidTab as ComponentType<BaseTabProps>,
};

interface ClientDataFormProps {
  client: ClientDoc;
  isEditable: boolean;
  activeTab?: ClientDataFormTabId;
  onActiveTabChange?: (tabId: ClientDataFormTabId) => void;
  onBack?: () => void;
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
  const ActiveTabContent = TAB_COMPONENTS[resolvedActiveTab];

  function handleTabChange(tabId: ClientDataFormTabId) {
    if (onActiveTabChange) {
      onActiveTabChange(tabId);
      return;
    }

    setInternalActiveTab(tabId);
  }

  return (
    <>
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
    </>
  );
}
