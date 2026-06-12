"use client";

import type { ClientDoc } from "@/components/clients/list/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";
import MedicalTab from "@/components/clients/tabs/MedicalTab";
import ContactsTab from "@/components/clients/tabs/ContactsTab";
import FinancialAidTab from "@/components/clients/tabs/FinancialAidTab";
import DocumentsTab from "@/components/clients/tabs/DocumentsTab";
import LogisticsTab from "@/components/clients/tabs/LogisticsTab";
import QuestionnaireTab from "@/components/clients/tabs/QuestionnaireTab";
import LegalConsentsTab from "@/components/clients/tabs/LegalConsentsTab";
import { QuickCopy } from "@/components/ui/QuickCopy";
import { IconPencil, IconLock } from "@/components/ui/Icons";
import ProfileSummaryDashboard from "./ProfileSummaryDashboard";
import AdvancedSettings from "./AdvancedSettings";
import ProfileArchiveModal from "./ProfileArchiveModal";
import { useProfileDashboard } from "./useProfileDashboard"; // Our new orchestrator hook

// ─── Tab configuration ────────────────────────────────────────────────────────

export const TABS = [
  { id: "profile", label: "Profile & Demographics" },
  { id: "medical", label: "Medical" },
  { id: "contacts", label: "Contacts" },
  { id: "logistics", label: "Logistics" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "legal", label: "Legal Consents" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Aid" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface BaseTabProps {
  client: ClientDoc;
  isEditable?: boolean;
  onBack?: () => void;
}

const TAB_COMPONENTS: Record<TabId, React.ComponentType<BaseTabProps>> = {
  profile: ProfileTab as React.ComponentType<BaseTabProps>,
  medical: MedicalTab as React.ComponentType<BaseTabProps>,
  contacts: ContactsTab as React.ComponentType<BaseTabProps>,
  logistics: LogisticsTab as React.ComponentType<BaseTabProps>,
  questionnaire: QuestionnaireTab as React.ComponentType<BaseTabProps>,
  legal: LegalConsentsTab as React.ComponentType<BaseTabProps>,
  documents: DocumentsTab as React.ComponentType<BaseTabProps>,
  financial: FinancialAidTab as React.ComponentType<BaseTabProps>,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProfileDashboardProps {
  client: ClientDoc;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientProfileDashboard({ client, onBack }: ClientProfileDashboardProps) {
  // Consume all Tier 2 side effects, async operations, and state variables via the hook
  const {
    activeTab,
    setActiveTab,
    isEditable,
    setIsEditable,
    isArchived,
    isRestoring,
    showArchiveModal,
    setShowArchiveModal,
    isArchiving,
    handleRestore,
    handleArchive,
  } = useProfileDashboard(client);

  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Archive Banner ── */}
      {isArchived && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠️ This client is archived. You are viewing this profile in Read-Only mode.
          </p>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRestoring ? "Restoring..." : "Restore Client"}
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="space-y-6">
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← Back to Clients
        </button>

        {/* ── Hero Card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-5 px-6 py-5 border-b border-slate-100">
            <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-100 ring-4 ring-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm select-none">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight truncate">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                {client.email && (
                  <div className="flex items-center gap-1">
                    {client.email}
                    <QuickCopy text={client.email} label="Email" />
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1">
                    {client.phone}
                    <QuickCopy text={client.phone} label="Phone Number" />
                  </div>
                )}
              </div>
            </div>

            <div className="ml-auto shrink-0">
              <button
                type="button"
                id="btn-toggle-edit-mode"
                disabled={isArchived}
                onClick={() => setIsEditable((prev) => !prev)}
                aria-pressed={isEditable && !isArchived}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  "border shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  isArchived
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70"
                    : isEditable
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-400"
                      : "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-400",
                ].join(" ")}
              >
                {isEditable && !isArchived ? (
                  <>
                    <IconLock className="h-4 w-4" />
                    Lock Editing
                  </>
                ) : (
                  <>
                    <IconPencil className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── View Switcher ── */}
        {isEditable ? (
          <>
            <nav aria-label="Client profile sections">
              <ol role="tablist" className="flex flex-wrap gap-2 w-full border-b border-slate-200 pb-2">
                {TABS.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <li key={tab.id} role="presentation">
                      <button
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                          "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                        ].join(" ")}
                      >
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <fieldset disabled={isArchived} className="min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                {(() => {
                  const ActiveTabContent = TAB_COMPONENTS[activeTab];
                  if (!ActiveTabContent) return null;

                  return (
                    <ActiveTabContent
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                      onBack={activeTab === "profile" ? onBack : undefined}
                    />
                  );
                })()}
              </div>
            </fieldset>
          </>
        ) : (
          <ProfileSummaryDashboard isArchived={isArchived} />
        )}

        {/* ── Advanced Settings ── */}
        <AdvancedSettings 
          isArchived={isArchived} 
          onArchiveTrigger={() => setShowArchiveModal(true)} 
        />
      </div>

      {/* ── Archive Confirmation Modal ── */}
      <ProfileArchiveModal
        isOpen={showArchiveModal}
        clientName={`${client.first_name} ${client.last_name}`}
        isArchiving={isArchiving}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
      />
    </div>
  );
}