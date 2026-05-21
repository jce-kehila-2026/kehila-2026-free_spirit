"use client";

import { useState } from "react";
import type { ClientDoc } from "@/components/clients/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";
import MedicalTab from "@/components/clients/tabs/MedicalTab";
import ContactsTab from "@/components/clients/tabs/ContactsTab";
import FinancialAidTab from "@/components/clients/tabs/FinancialAidTab";
import DocumentsTab from "@/components/clients/tabs/DocumentsTab";

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",   label: "Profile & Demographics" },
  { id: "medical",   label: "Medical" },
  { id: "contacts",  label: "Contacts" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Aid" },
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

  return (
    <div className="mx-auto max-w-5xl">
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
            onClick={() => setIsEditable((prev) => !prev)}
            aria-pressed={isEditable}
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
              "border shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
              isEditable
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-400"
                : "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-400",
            ].join(" ")}
          >
            {isEditable ? (
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
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "profile"   && <ProfileTab    client={client} isEditable={isEditable} />}
        {activeTab === "medical"   && <MedicalTab    client={client} isEditable={isEditable} />}
        {activeTab === "contacts"  && <ContactsTab   client={client} isEditable={isEditable} />}
        {activeTab === "documents" && <DocumentsTab  client={client} />}
        {activeTab === "financial" && <FinancialAidTab client={client} isEditable={isEditable} />}
      </div>
    </div>
  );
}
