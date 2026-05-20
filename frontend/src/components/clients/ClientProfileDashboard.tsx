"use client";

import { useState } from "react";
import type { ClientDoc } from "@/components/clients/ClientList";
import ProfileTab from "@/components/clients/tabs/ProfileTab";

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",   label: "Profile & Demographics" },
  { id: "medical",   label: "Medical" },
  { id: "contacts",  label: "Contacts" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Aid" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Placeholder panel for not-yet-built tabs ─────────────────────────────────

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label} Tab Content Goes Here</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProfileDashboardProps {
  client: ClientDoc;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ClientProfileDashboard
 *
 * A horizontally-tabbed shell for viewing and editing an existing client record.
 * Tab 1 (Profile & Demographics) is fully implemented via ProfileTab.
 * Tabs 2-5 are placeholders awaiting implementation.
 */
export default function ClientProfileDashboard({
  client,
  onBack,
}: ClientProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Back button and title ── */}
      <div className="mb-6 flex flex-col items-start">
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="mb-4 inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← Back to Clients
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          Client Profile:{" "}
          <span className="font-semibold text-indigo-600">
            {client.first_name} {client.last_name}
          </span>
        </h1>
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
        {activeTab === "profile"   && <ProfileTab client={client} />}
        {activeTab === "medical"   && <PlaceholderPanel label="Medical" />}
        {activeTab === "contacts"  && <PlaceholderPanel label="Contacts" />}
        {activeTab === "documents" && <PlaceholderPanel label="Documents" />}
        {activeTab === "financial" && <PlaceholderPanel label="Financial Aid" />}
      </div>
    </div>
  );
}
