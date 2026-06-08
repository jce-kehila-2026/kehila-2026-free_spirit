"use client";

import { useState, useMemo } from "react";
import { useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import ClientList, { type ClientDoc } from "@/components/clients/ClientList";
import WizardController from "@/components/clients/RegistrationWizard/WizardController";
import ClientProfileDashboard from "@/components/clients/ClientProfileDashboard";

// ─── Inline icon helpers ─────────────────────────────────────────────────────────────



function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function IconArrowLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  );
}

function IconChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

type View = "list" | "form" | "dashboard";

// ─── CSV export helper ────────────────────────────────────────────────────────

/**
 * Converts an array of ClientDoc objects into a CSV string and triggers a
 * native browser download. The filename includes today's date.
 */
function exportToCSV(rows: ClientDoc[]): void {
  const escaped = (val: unknown) =>
    `"${String(val ?? "").replace(/"/g, '""')}"`;

  const HEADERS = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Status",
    "Passport ID",
  ];

  const csvRows = [
    HEADERS.join(","),
    ...rows.map((c) =>
      [
        escaped(c.first_name),
        escaped(c.last_name),
        escaped(c.email),
        escaped(c.phone),
        escaped(c.status),
        // Force Excel to treat the passport as a literal text string using ="value"
        c.passport_id
          ? `="${String(c.passport_id).replace(/"/g, '""')}"`
          : '""',
      ].join(","),
    ),
  ];

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-06-03"
  const filename = `free-spirit-clients-${today}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function ClientsPage() {
  const [view, setView] = useState<View>("list");
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);

  // ── Search & filter state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "registered" | "interested" | "draft"
  >("all");

  // ── Shared Firestore snapshot ─────────────────────────────────────────
  const [allDocs, setAllDocs] = useState<ClientDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ClientDoc[];
        setAllDocs(docs);
        setIsLoading(false);
      },
      (error) => {
        console.error("[ClientsPage] onSnapshot error:", error);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  // ── Filtered clients (search + status) ───────────────────────────────
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allDocs.filter((client) => {
      // ── Status gate ──────────────────────────────────────────────────
      // "all" → no gate; otherwise match client.status exactly.
      if (statusFilter !== "all" && client.status !== statusFilter)
        return false;
      // statusFilter === "all" → no status gate

      // ── Search gate ──────────────────────────────────────────────────
      if (!q) return true;

      return [
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        client.passport_id,
        client.passport_number,
      ].some((field) => field?.toLowerCase().includes(q));
    });
  }, [allDocs, searchQuery, statusFilter]);

  const [showArchived, setShowArchived] = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div
        className={[
          "mx-auto",
          view === "dashboard" ? "max-w-5xl" : "max-w-5xl",
        ].join(" ")}
      >
        {/* ── Header bar (hidden when dashboard is showing) ── */}
        {view !== "dashboard" && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Page title */}
            <h1 className="text-2xl font-bold text-slate-800">
              {view === "list"
                ? "Client Management"
                : editingClient
                  ? "Edit Client"
                  : "New Client"}
            </h1>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {view === "list" ? (
                /* Add New — primary, standalone */
                <button
                  type="button"
                  id="btn-add-new-client"
                  onClick={handleAddNew}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
                >
                  <IconPlus className="h-4 w-4" />
                  Add New Client
                </button>
              ) : (
                /* Back button — shown on form view */
                <button
                  type="button"
                  id="btn-back-to-list"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  Back to List
                </button>
              )}
            </div>
          </div>
        )}

        {/* NOTE: The archived mode banner is rendered inside <ClientList> — not here — to avoid duplication. */}

        {/* ── Global control bar (search + status filter + utility actions) ── */}
        {view === "list" && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                id="input-client-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, passport ID, phone, or email…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Journey-status dropdown */}
            <div className="relative sm:w-48">
              <select
                id="select-client-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "registered" | "interested" | "draft",
                  )
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="interested">Interested</option>
                <option value="draft">Draft</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <IconChevronDown className="h-4 w-4" />
              </span>
            </div>

            {/* Result count chip — only shown when a filter is active */}
            {(searchQuery.trim() || statusFilter !== "all") && (
              <span className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                {filteredClients.length} result{filteredClients.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── View toggle ── */}
        {view === "list" ? (
          <ClientList
            onEdit={handleEdit}
            externalDocs={filteredClients}
            externalLoading={isLoading}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived((prev) => !prev)}
            onExport={() => exportToCSV(filteredClients)}
          />
        ) : view === "dashboard" && editingClient ? (
          <ClientProfileDashboard
            client={editingClient}
            onBack={handleBackToList}
          />
        ) : (
          <WizardController
            initialData={editingClient}
            onSaveSuccess={handleBackToList}
          />
        )}
      </div>
    </main>
  );
}
