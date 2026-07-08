"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/firebase/firebase";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import ClientDataForm from "@/components/clients/forms/ClientDataForm";
import { QuickCopy } from "@/components/ui/QuickCopy";
import { IconPencil, IconLock, IconEye } from "@/components/ui/Icons";
import ProfileSummaryDashboard from "./ProfileSummaryDashboard";
import AdvancedSettings from "./AdvancedSettings";
import ProfileArchiveModal from "./ProfileArchiveModal";
import StatusConfirmationModal from "./StatusConfirmationModal";
import { useProfileDashboard } from "./useProfileDashboard"; // Our new orchestrator hook
import {
  getClientRegistrationInviteResendState,
  queueClientRegistrationInviteEmail,
  updateClientStatus,
} from "@/application/ClientManagementService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProfileDashboardProps {
  client: ClientDoc;
  onBack: () => void;
}

type AuthUserWithProfile = User & {
  first_name?: string;
  last_name?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientProfileDashboard({ client: initialClient, onBack }: ClientProfileDashboardProps) {
  const [statusOverride, setStatusOverride] = useState<{
    clientId: string;
    status: ClientDoc["status"];
  } | null>(null);

  // Keep Firestore data as the base record and overlay only the locally saved
  // status. This avoids a React 19 prop-to-state effect while preserving the
  // immediate status badge update after a successful transition.
  const client: ClientDoc =
    statusOverride?.clientId === initialClient.id
      ? { ...initialClient, status: statusOverride.status }
      : initialClient;

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
  const [canResendInvite, setCanResendInvite] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);

  useEffect(() => {
    let shouldIgnore = false;

    async function resolveInviteState() {
      if (client.status !== "invited" || isArchived) {
        setCanResendInvite(false);
        return;
      }

      setIsCheckingInvite(true);
      try {
        const inviteState = await getClientRegistrationInviteResendState(client.id);

        if (!shouldIgnore) {
          setCanResendInvite(inviteState.canResend);
        }
      } catch (error) {
        console.error("[ClientProfileDashboard] invite state check failed:", error);

        if (!shouldIgnore) {
          setCanResendInvite(false);
        }
      } finally {
        if (!shouldIgnore) {
          setIsCheckingInvite(false);
        }
      }
    }

    resolveInviteState();

    return () => {
      shouldIgnore = true;
    };
  }, [client.id, client.status, isArchived]);

  async function handleStatusChange() {
    if (client.status !== "interested") {
      toast.error("Only interested clients can receive a first invitation.");
      setIsStatusModalOpen(false);
      return;
    }

    const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
    // Toggle: registered → interested, anything else → registered
    const newStatus = "invited";
    setIsUpdatingStatus(true);
    try {
      const user = auth?.currentUser as AuthUserWithProfile | null;
      let managerName = "Unknown";
      if (user?.first_name && user?.last_name) {
        managerName = `${user.first_name} ${user.last_name}`;
      } else if (user?.email) {
        managerName = user.email.charAt(0).toUpperCase();
      }

      await updateClientStatus(client.id, clientName, newStatus, managerName);
      setStatusOverride({ clientId: client.id, status: newStatus });

      if (newStatus === "invited" && typeof window !== "undefined") {
        try {
          // Registration queues the invite email through Firestore instead of
          // exposing the raw onboarding URL in an admin copy dialog.
          await queueClientRegistrationInviteEmail(
            client.id,
            client.email,
            window.location.origin,
          );
        } catch (error) {
          console.error("[ClientProfileDashboard] invite generation failed:", error);
          toast.error("Registration completed, but the invitation email could not be queued.");
        }
      }
    } catch {
      // Status service owns the user-facing failure toast.
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

  async function handleResendInvitation() {
    if (typeof window === "undefined") {
      return;
    }

    setIsResendingInvite(true);
    try {
      // Resend uses the same secure generator as first registration, creating
      // a fresh token with a new 24-hour expiry before queuing email delivery.
      await queueClientRegistrationInviteEmail(
        client.id,
        client.email,
        window.location.origin,
      );
      setCanResendInvite(false);
    } catch (error) {
      console.error("[ClientProfileDashboard] invite resend failed:", error);
      toast.error("The invitation email could not be resent.");
    } finally {
      setIsResendingInvite(false);
    }
  }

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
        {/* ── Hero Card ── */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)]">
          <button
            type="button"
            id="btn-back-to-clients"
            onClick={onBack}
            className="absolute left-4 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/30 bg-white px-3 py-1.5 text-xs font-bold text-[#245C66] shadow-sm transition-colors hover:bg-[#EEF4EC] hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-8"
          >
            &larr; Clients
          </button>

          <div className="flex flex-col gap-5 px-5 py-6 pl-24 sm:flex-row sm:items-center sm:px-8 sm:py-7 sm:pl-36">
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
                  disabled={client.status !== "interested"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-transparent px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors duration-150 hover:border-white/60 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-white/30 disabled:hover:bg-transparent disabled:hover:text-white/80"
                  aria-label={
                    client.status === "interested"
                      ? "Invite client"
                      : "Client is already past the initial invite step"
                  }
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
              {!isArchived && client.status === "invited" && canResendInvite && (
                <button
                  type="button"
                  onClick={handleResendInvitation}
                  disabled={isCheckingInvite || isResendingInvite}
                  className="inline-flex items-center rounded-lg border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#245C66] shadow-sm transition-colors duration-150 hover:bg-[#EEF4EC] focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResendingInvite ? "Resending..." : "Resend Invitation"}
                </button>
              )}

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
          <ClientDataForm
            client={client}
            isEditable={effectiveEditable}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            onBack={onBack}
          />
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
