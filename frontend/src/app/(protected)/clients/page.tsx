"use client";

import { useState } from "react";
import ClientList, {
  type ClientDoc,
} from "@/components/clients/ClientList";
import WizardController from "@/components/clients/RegistrationWizard/WizardController";

type View = "list" | "form";

export default function ClientsPage() {
  const [view, setView] = useState<View>("list");
  const [editingClient, setEditingClient] = useState<ClientDoc | null>(null);

  // ── Actions ────────────────────────────────────────────────────────────

  function handleAddNew() {
    setEditingClient(null);
    setView("form");
  }

  function handleEdit(client: ClientDoc) {
    setEditingClient(client);
    setView("form");
  }

  function handleBackToList() {
    setEditingClient(null);
    setView("list");
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        {/* ── Header bar ── */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            {view === "list" ? "Client Management" : editingClient ? "Edit Client" : "New Client"}
          </h1>

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

        {/* ── View toggle ── */}
        {view === "list" ? (
          <ClientList onEdit={handleEdit} />
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
