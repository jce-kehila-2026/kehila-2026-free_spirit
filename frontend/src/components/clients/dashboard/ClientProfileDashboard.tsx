"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { IconPencil, IconLock, IconEye } from "@/components/ui/Icons";
import ProfileSummaryDashboard from "./ProfileSummaryDashboard";
import AdvancedSettings from "./AdvancedSettings";
import ProfileArchiveModal from "./ProfileArchiveModal";
import StatusConfirmationModal from "./StatusConfirmationModal";
import { useProfileDashboard } from "./useProfileDashboard"; // Our new orchestrator hook
import { updateClientStatus } from "@/application/ClientManagementService";

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

export default function ClientProfileDashboard({ client: initialClient, onBack }: ClientProfileDashboardProps) {
  const [client, setClient] = useState<ClientDoc>(initialClient);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  // Consume all Tier 2 side effects, async operations, and state variables via the hook
  const {
    activeTab,
    setActiveTab,
    isEditable,
    setIsEditable,
    showDetailedTabs,
    setShowDetailedTabs,
    effectiveEditable,
    isArchived,
    isRestoring,
    showArchiveModal,
    setShowArchiveModal,
    isArchiving,
    handleRestore,
    handleArchive,
  } = useProfileDashboard(client);

  // ── Status badge state ───────────────────────────────────────────────────
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  async function handleStatusChange() {
    const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
    // Toggle: registered → interested, anything else → registered
    const newStatus = client.status === "registered" ? "interested" : "registered";
    setIsUpdatingStatus(true);
    try {
      await updateClientStatus(client.id, clientName, newStatus);
      setClient((prev) => ({ ...prev, status: newStatus }));
    } catch {
      // Toast already fired by the service layer
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusModalOpen(false);
    }
  }

  const router = useRouter();
  const handleCreateMeetingNavigation = () => {
    // Navigates to the events path passing the client context via URL query parameters
    const queryParams = new URLSearchParams({
      action: "new-meeting",
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
    });
    router.push(`/events?${queryParams.toString()}`);
  };

  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-7xl py-2">
      {/* ── Archive Banner ── */}
      {isArchived && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E5C97D] bg-[#F7EED8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#785B20]">
            ⚠️ This client is archived. You are viewing this profile in Read-Only mode.
          </p>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#8A6822] ring-1 ring-[#E5C97D] transition-colors hover:bg-[#FBF5E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRestoring ? "Restoring..." : "Restore Client"}
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="space-y-5">
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#31585F] shadow-sm ring-1 ring-[#D7E3D5] transition-colors hover:bg-[#EEF4EC] hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0]"
        >
          ← Back to Clients
        </button>

        {/* ── Hero Card ── */}
        <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)]">
          <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:px-8 sm:py-7">
            <div className="flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/25 shadow-sm">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="mt-1 truncate text-3xl font-bold leading-tight tracking-[-0.04em]">
                {client.first_name} {client.last_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/75">
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

            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              {/* ── Status badge (active clients only) ── */}
              {!isArchived && (
                <button
                  type="button"
                  id="btn-status-badge"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-transparent px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors duration-150 hover:border-white/60 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-label="Change client status"
                >
                  <span className={[
                    "h-1.5 w-1.5 rounded-full",
                    client.status === "registered" ? "bg-emerald-400" : "bg-amber-400",
                  ].join(" ")} />
                  Status: {client.status
                    ? client.status.charAt(0).toUpperCase() + client.status.slice(1)
                    : "Unknown"}
                </button>
              )}

              {/* ── Active client: Edit Profile / Lock Editing toggle ── */}
              {!isArchived && (
                <button
                  type="button"
                  id="btn-toggle-edit-mode"
                  onClick={() => {
                    if (isEditable) {
                      // Lock: collapse back to summary view
                      setIsEditable(false);
                      setShowDetailedTabs(false);
                    } else {
                      // Edit: open detailed tabs in edit mode
                      setIsEditable(true);
                      setShowDetailedTabs(true);
                    }
                  }}
                  aria-pressed={isEditable}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                    "border shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    isEditable
                      ? "border-[#C5DDC0] bg-[#E5F0E2] text-[#3F7763] hover:bg-[#D8E9D5] focus:ring-[#6BB2A0]"
                      : "border-white/30 bg-white text-[#245C66] hover:bg-[#EEF4EC] focus:ring-white",
                  ].join(" ")}
                >
                  {isEditable ? (
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
              )}

              {/* ── Archived client: read-only tab access ── */}
              {isArchived && (
                <button
                  type="button"
                  id="btn-view-detailed-records"
                  onClick={() => setShowDetailedTabs((prev) => !prev)}
                  aria-pressed={showDetailedTabs}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                    "border shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    showDetailedTabs
                      ? "border-[#E5C97D] bg-[#F7EED8] text-[#8A6822] hover:bg-[#F1E3BF] focus:ring-[#E5C97D]"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/20 focus:ring-white",
                  ].join(" ")}
                >
                  <IconEye className="h-4 w-4" />
                  {showDetailedTabs ? "Back to Overview" : "View Detailed Records"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── View Switcher ── */}
        {showDetailedTabs ? (
          <>
            <nav aria-label="Client profile sections" className="overflow-x-auto rounded-2xl border border-white/80 bg-[#FFFDF8] p-2 shadow-[0_10px_25px_rgba(44,105,117,0.06)]">
              <ol role="tablist" className="flex min-w-max gap-1.5">
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
              <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                {(() => {
                  const ActiveTabContent = TAB_COMPONENTS[activeTab];
                  if (!ActiveTabContent) return null;

                  return (
                    <ActiveTabContent
                      client={client}
                      isEditable={effectiveEditable}
                      onBack={activeTab === "profile" ? onBack : undefined}
                    />
                  );
                })()}
              </div>
            </fieldset>
          </>
        ) : (
          <ProfileSummaryDashboard 
             client={client} 
             isArchived={isArchived} 
             onCreateMeeting={handleCreateMeetingNavigation} 
          />
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

      {/* ── Status Confirmation Modal ── */}
      {isStatusModalOpen && (
        <StatusConfirmationModal
          currentStatus={client.status === "registered" ? "registered" : "interested"}
          clientName={`${client.first_name} ${client.last_name}`}
          isLoading={isUpdatingStatus}
          onConfirm={handleStatusChange}
          onClose={() => {
            if (!isUpdatingStatus) setIsStatusModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
