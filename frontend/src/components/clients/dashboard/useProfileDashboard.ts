"use client";

import { useState } from "react";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import { restoreClientInDb, archiveClientInDb } from "@/firebase/clientDbService";
import { toast } from "sonner";
import { type ClientDataFormTabId } from "@/components/clients/forms/ClientDataForm";

export function useProfileDashboard(client: ClientDoc) {
  const [activeTab, setActiveTab] = useState<ClientDataFormTabId>("profile");
  const [isEditable, setIsEditable] = useState(false);
  const [showDetailedTabs, setShowDetailedTabs] = useState(false);
  const [localIsArchived, setLocalIsArchived] = useState(client.is_archived === true);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Tier 3 business rule: archived clients can never write data.
  // Computed once here so no JSX site needs to inline this logic.
  const effectiveEditable = !localIsArchived && isEditable;

  async function handleRestore() {
      setIsRestoring(true);
      try {
          await restoreClientInDb(client.id);
          toast.success(`${client.first_name} ${client.last_name} has been restored to active clients.`);
          setLocalIsArchived(false);
      } catch (err) {
          console.error("[ProfileDashboard] Restore failed:", err);
          toast.error("Failed to restore client. Please check your connection.");
      } finally {
          setIsRestoring(false);
      }
  }

  async function handleArchive() {
      setIsArchiving(true);
      try {
          await archiveClientInDb(client.id);
          toast.success(`${client.first_name} ${client.last_name} has been archived.`);
          setLocalIsArchived(true);
          setShowArchiveModal(false);
          setIsEditable(false);
          setShowDetailedTabs(false);
      } catch (err) {
          console.error("[ProfileDashboard] Archive failed:", err);
          toast.error("Failed to archive client. Please check your connection.");
      } finally {
          setIsArchiving(false);
      }
  }

  return {
      activeTab,
      setActiveTab,
      isEditable,
      setIsEditable,
      showDetailedTabs,
      setShowDetailedTabs,
      effectiveEditable,
      isArchived: localIsArchived,
      showArchiveModal,
      setShowArchiveModal,
      isArchiving,
      isRestoring,
      handleRestore,
      handleArchive,
  };
}
