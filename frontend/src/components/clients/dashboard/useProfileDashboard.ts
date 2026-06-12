"use client";

import { useState } from "react";
import { type ClientDoc } from "@/components/clients/ClientList";
import { restoreClient, archiveClient } from "@/application/ClientManagementService";
import { toast } from "sonner";
import { type TabId } from "./ClientProfileDashboard";

export function useProfileDashboard(client: ClientDoc) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditable, setIsEditable] = useState(false);
  const [localIsArchived, setLocalIsArchived] = useState(client.is_archived === true);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleRestore() {
      setIsRestoring(true);
      try {
          await restoreClient(client.id);
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
          await archiveClient(client.id);
          toast.success(`${client.first_name} ${client.last_name} has been archived.`);
          setLocalIsArchived(true);
          setShowArchiveModal(false);
          setIsEditable(false);
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
      isArchived: localIsArchived,
      showArchiveModal,
      setShowArchiveModal,
      isArchiving,
      isRestoring,
      handleRestore,
      handleArchive,
  };
}