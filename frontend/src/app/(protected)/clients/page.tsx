"use client";

import { useState, useMemo } from "react";
import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import ClientList, {
  type ClientDoc,
} from "@/components/clients/ClientList";
import ClientMetrics from "@/components/clients/ClientMetrics";
import WizardController from "@/components/clients/RegistrationWizard/WizardController";
import ClientProfileDashboard from "@/components/clients/ClientProfileDashboard";

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
        c.passport_id ? `="${String(c.passport_id).replace(/"/g, '""')}"` : '""',
      ].join(",")
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

  // ── Analytics panel toggle ────────────────────────────────────────────
  const [showMetrics, setShowMetrics] = useState(false);

  // ── Search & filter state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");

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
      }
    );
    return unsubscribe;
  }, []);

  // ── Filtered clients (search + status) ───────────────────────────────
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allDocs.filter((client) => {
      // ── Status gate ──────────────────────────────────────────────────
      if (statusFilter === "archived") {
        if (client.is_archived !== true) return false;
      } else if (statusFilter === "draft") {
        if (client.is_archived === true) return false;
        if (client.status !== "draft") return false;
      } else if (statusFilter === "active") {
        // "active" in UI = any non-archived client
        if (client.is_archived === true) return false;
      }
      // statusFilter === "all" → no status gate

      // ── Search gate ──────────────────────────────────────────────────
      if (!q) return true;

      return [
        client.first_name,
        client.last_name,
        client.phone,
        client.passport_id,
        client.passport_number,
      ].some((field) => field?.toLowerCase().includes(q));
    });
  }, [allDocs, searchQuery, statusFilter]);

  // ── Actions ────────────────────────────────────────────────────────────

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
      <div className={["mx-auto", view === "dashboard" ? "max-w-5xl" : "max-w-4xl"].join(" ")}>
        {/* ── Header bar (hidden when dashboard is showing) ── */}
        {view !== "dashboard" && (
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">
              {view === "list" ? "Client Management" : editingClient ? "Edit Client" : "New Client"}
            </h1>

            <div className="flex items-center gap-3">
              {/* Analytics toggle — only visible on list view */}
              {view === "list" && (
                <button
                  type="button"
                  id="btn-toggle-analytics"
                  onClick={() => setShowMetrics((prev) => !prev)}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200",
                    showMetrics
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                  aria-expanded={showMetrics}
                  aria-controls="client-metrics-panel"
                >
                  {/* Chart icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 9.5 6ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 10Z" />
                  </svg>
                  {showMetrics ? "Hide Analytics" : "Show Analytics"}
                </button>
              )}

              {view === "list" ? (
                <button
                  type="button"
                  id="btn-add-new-client"
                  onClick={handleAddNew}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  + Add New Client
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-back-to-list"
                  onClick={handleBackToList}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  ← Back to List
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Action Required panel ── */}
        {view === "list" && showMetrics && (
          <div id="client-metrics-panel">
            <ClientMetrics clients={allDocs} onOpenClient={handleEdit} />
          </div>
        )}

        {/* ── Search & Filter bar ── */}
        {view === "list" && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                placeholder="Search by name, passport ID, or phone…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Status dropdown */}
            <div className="relative sm:w-44">
              <select
                id="select-client-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "draft" | "archived"
                  )
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Clients</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              {/* Chevron icon */}
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>

            {/* Result count chip — only shown when a filter is active */}
            {(searchQuery.trim() || statusFilter !== "all") && (
              <span className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                {filteredClients.length} result{filteredClients.length !== 1 ? "s" : ""}
              </span>
            )}

            {/* Export to CSV button */}
            <button
              type="button"
              id="btn-export-csv"
              onClick={() => exportToCSV(filteredClients)}
              disabled={filteredClients.length === 0}
              aria-label="Export filtered clients to CSV"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {/* Download arrow icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              >
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Export CSV
            </button>
          </div>
        )}

        {/* ── View toggle ── */}
        {view === "list" ? (
          <ClientList
            onEdit={handleEdit}
            externalDocs={filteredClients}
            externalLoading={isLoading}
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
