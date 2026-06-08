"use client";

import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { toast } from "sonner";
import type { ClientDoc } from "@/components/clients/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";
import MedicalTab from "@/components/clients/tabs/MedicalTab";
import ContactsTab from "@/components/clients/tabs/ContactsTab";
import FinancialAidTab from "@/components/clients/tabs/FinancialAidTab";
import DocumentsTab from "@/components/clients/tabs/DocumentsTab";
import LogisticsTab from "@/components/clients/tabs/LogisticsTab";
import QuestionnaireTab from "@/components/clients/tabs/QuestionnaireTab";
import LegalConsentsTab from "@/components/clients/tabs/LegalConsentsTab";

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",      label: "Profile & Demographics" },
  { id: "medical",      label: "Medical" },
  { id: "contacts",     label: "Contacts" },
  { id: "logistics",    label: "Logistics" },
  { id: "questionnaire",label: "Questionnaire" },
  { id: "legal",        label: "Legal Consents" },
  { id: "documents",    label: "Documents" },
  { id: "financial",    label: "Financial Aid" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProfileDashboardProps {
  client: ClientDoc;
  onBack: () => void;
}

// ─── Pencil icon (view-mode indicator) ───────────────────────────────────────

function IconPencil() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

// ─── Lock icon (edit-mode indicator) ─────────────────────────────────────────

function IconLock() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ClientProfileDashboard
 *
 * A horizontally-tabbed shell for viewing and editing an existing client record.
 * Supports a unified View / Edit mode toggled via the `isEditable` state.
 * When isEditable is false (default), all child tabs render their fields as
 * read-only typography and hide the sticky Save footer.
 */
export default function ClientProfileDashboard({
  client,
  onBack,
}: ClientProfileDashboardProps) {
  const [activeTab, setActiveTab]   = useState<TabId>("profile");
  const [isEditable, setIsEditable] = useState(false);
  
  // Manage local archive state so we can immediately drop the lock upon restore
  const [localIsArchived, setLocalIsArchived] = useState(client.is_archived === true);
  const [isRestoring, setIsRestoring] = useState(false);

  const isArchived = localIsArchived;

  async function handleRestore() {
    setIsRestoring(true);
    try {
      const docRef = doc(db, "clients", client.id);
      await updateDoc(docRef, {
        is_archived: false,
        updated_at: serverTimestamp(),
      });
      toast.success(`${client.first_name} ${client.last_name} has been restored to active clients.`);
      setLocalIsArchived(false);
    } catch (err) {
      console.error("[ClientProfileDashboard] Restore failed:", err);
      toast.error("Failed to restore client. Please check your connection and try again.");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Archive Banner ── */}
      {isArchived && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ This client is archived. You are viewing this profile in Read-Only mode.
            </p>
          </div>
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

      {/* ── Back button, title, and Edit/View toggle ── */}
      <div className="mb-6 flex flex-col items-start">
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="mb-4 inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← Back to Clients
        </button>

        {/* Title row */}
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">
            Client Profile:{" "}
            <span className="font-semibold text-indigo-600">
              {client.first_name} {client.last_name}
            </span>
          </h1>

          {/* ── View / Edit mode toggle button ── */}
          <button
            type="button"
            id="btn-toggle-edit-mode"
            disabled={isArchived}
            onClick={() => setIsEditable((prev) => !prev)}
            aria-pressed={isEditable && !isArchived}
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
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
                <IconLock />
                Lock Editing
              </>
            ) : (
              <>
                <IconPencil />
                Edit Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <nav aria-label="Client profile sections" className="mb-6 overflow-x-auto">
        <ol
          role="tablist"
          className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id} role="presentation" className="flex-1">
                <button
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "w-full whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
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

      {/* ── Tab panels ── */}
      <fieldset disabled={isArchived} className="min-w-0">
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "profile"       && <ProfileTab      client={client} isEditable={isArchived ? false : isEditable} onBack={onBack} />}
          {activeTab === "medical"       && <MedicalTab       client={client} isEditable={isArchived ? false : isEditable} />}
          {activeTab === "contacts"      && <ContactsTab      client={client} isEditable={isArchived ? false : isEditable} />}
          {activeTab === "logistics"     && <LogisticsTab     client={client} isEditable={isArchived ? false : isEditable} />}
          {activeTab === "questionnaire" && <QuestionnaireTab client={client} isEditable={isArchived ? false : isEditable} />}
          {activeTab === "legal"         && <LegalConsentsTab client={client} isEditable={isArchived ? false : isEditable} />}
          {activeTab === "documents"     && <DocumentsTab     client={client} />}
          {activeTab === "financial"     && <FinancialAidTab  client={client} isEditable={isArchived ? false : isEditable} />}
        </div>
      </fieldset>
    </div>
  );
}
