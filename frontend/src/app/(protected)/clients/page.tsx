"use client";

import { useState } from "react";
import { exportToCSV } from "@/components/clients/list/csvExport";

// TIER 1 - PRESENTATION LAYER WIDGETS
import ClientList, { type ClientDoc } from "@/components/clients/list/ClientList";
import ClientIntakeForm from "@/components/clients/intake/ClientIntakeForm";
import ClientProfileDashboard from "@/components/clients/dashboard/ClientProfileDashboard";
import ClientPageHeader from "@/components/clients/list/ClientPageHeader";
import ClientFilterBar from "@/components/clients/list/ClientFilterBar";
import ClientFieldManagerModal from "@/components/clients/fields/ClientFieldManagerModal";

// TIER 2 - APPLICATION LAYER
import { useClientManagementService } from "@/application/ClientManagementService"; 

// TIER 3 - BUSINESS RULES LAYER
import { useClientFilters } from "@/application/useClientFilters";
import RestoreModal from "@/components/clients/list/RestoreModal";
import { getFirestoreDb } from "@/firebase/clientDbService";
import { doc, getDoc } from "firebase/firestore";

type View = "list" | "form" | "dashboard";

/**
 * Presentation Layer (client home screen):
 * Serves purely as a View Controller. Following 4-tier guidelines, it contains 
 * zero direct database queries or data processing rules. It consumes lower tiers 
 * and coordinates presentation components.
 */

export default function ClientsPage() {
  const [view, setView] = useState<View>("list");
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isFieldManagerOpen, setIsFieldManagerOpen] = useState(false);

  // Application Layer - Live Firestore Data Stream
  const { 
  allDocs, 
  isLoading,  
  restoreTarget, 
  setRestoreTarget, 
  isRestoring, 
  handleRestore 
} = useClientManagementService();

  // Pass that data into the Business Rules Layer to get the filtered results
  // Business Rules Layer - Client Filtering & Sorting Policies
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    columnFilters, handleColumnFilterChange,
    sortConfig, setSortConfig,
    handleClearAllFilters,
    hasActiveFilters,
    totalActiveCount,
    filteredClients,
    programMap
  } = useClientFilters(allDocs);

  // -- Actions --
  /*
    These functions are needed to tell the page which component to render.
    This allows the whole client section to be in one dynamic page 
    (without the URL changing when clicking a client)
  */

  function handleAddNew() {
    setEditingClient(null);
    setView("form");
  }

  function handleEdit(client: ClientDoc) {
    setEditingClient(client);
    setView("dashboard");
  }

  function handleBackToList() {
    setEditingClient(null);
    setView("list");
  }

  async function handleRefreshClient() {
    if (!editingClient?.id) return;
    try {
      const db = getFirestoreDb();
      const snap = await getDoc(doc(db, "clients", editingClient.id));
      if (snap.exists()) {
        setEditingClient({ id: snap.id, ...snap.data() } as ClientDoc);
      }
    } catch (err) {
      console.error("Failed to refresh client data", err);
    }
  }
// ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        
        <ClientPageHeader 
          view={view} 
          editingClient={editingClient} 
          onAddNew={handleAddNew} 
          onBackToList={handleBackToList} 
          onManageFields={() => setIsFieldManagerOpen(true)}
        />

        <ClientFieldManagerModal
          isOpen={isFieldManagerOpen}
          onClose={() => setIsFieldManagerOpen(false)}
        />

        {view === "list" && (
          <>
            <ClientFilterBar 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
            
            <ClientList
              onEdit={handleEdit}
              externalDocs={filteredClients}
              baseDocs={showArchived ? allDocs.filter(c => c.is_archived === true) : allDocs.filter(c => c.is_archived !== true)}
              externalLoading={isLoading}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived((prev) => !prev)}
              onExport={() => exportToCSV(filteredClients)}
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
              totalActiveCount={totalActiveCount}
              onClearAllFilters={handleClearAllFilters}
              hasActiveFilters={hasActiveFilters}
              onRestoreSelect={setRestoreTarget}
              programMap={programMap}
            />

            {/* Render the modal at the page view-controller root level */}
            {restoreTarget && (
              <RestoreModal
                client={restoreTarget}
                onCancel={() => setRestoreTarget(null)}
                onConfirm={handleRestore}
                isRestoring={isRestoring}
              />
            )}
          </>
        )}

        {view === "dashboard" && editingClient && (
          <ClientProfileDashboard
            client={editingClient}
            onBack={handleBackToList}
            onRefreshClient={handleRefreshClient}
          />
        )}

        {view === "form" && (
          <ClientIntakeForm
            onSaveSuccess={handleBackToList}
            onCancel={handleBackToList}
          />
        )}

      </div>
    </main>
  );
}
