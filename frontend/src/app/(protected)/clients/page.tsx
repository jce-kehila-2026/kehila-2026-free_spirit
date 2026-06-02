"use client";

import { useState } from "react";
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

export default function ClientsPage() {
  const [view, setView] = useState<View>("list");
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);

  // ── Analytics panel toggle ────────────────────────────────────────────
  const [showMetrics, setShowMetrics] = useState(false);

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

        {/* ── View toggle ── */}
        {view === "list" ? (
          <ClientList
            onEdit={handleEdit}
            externalDocs={allDocs}
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
