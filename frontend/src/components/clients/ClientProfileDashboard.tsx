"use client";

import { useState } from "react";

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",     label: "Profile & Demographics" },
  { id: "medical",     label: "Medical" },
  { id: "contacts",    label: "Contacts" },
  { id: "documents",   label: "Documents" },
  { id: "financial",   label: "Financial Aid" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Tab content placeholders ─────────────────────────────────────────────────

function TabContent({ activeTab }: { activeTab: TabId }) {
  const labels: Record<TabId, string> = {
    profile:   "Profile & Demographics Tab Content Goes Here",
    medical:   "Medical Tab Content Goes Here",
    contacts:  "Contacts Tab Content Goes Here",
    documents: "Documents Tab Content Goes Here",
    financial: "Financial Aid Tab Content Goes Here",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{labels[activeTab]}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ClientProfileDashboard
 *
 * A horizontally-tabbed shell for viewing and editing an existing client record.
 * Contains five tabs: Profile & Demographics, Medical, Contacts, Documents,
 * and Financial Aid. Tab content areas are placeholders awaiting implementation.
 */
export default function ClientProfileDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Tab bar ── */}
      <nav
        aria-label="Client profile sections"
        className="mb-6 overflow-x-auto"
      >
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

      {/* ── Tab panel ── */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  );
}
