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
import { QuickCopy } from "@/components/ui/QuickCopy";

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "Profile & Demographics" },
  { id: "medical", label: "Medical" },
  { id: "contacts", label: "Contacts" },
  { id: "logistics", label: "Logistics" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "legal", label: "Legal Consents" },
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
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditable, setIsEditable] = useState(false);

  // Manage local archive state so we can immediately drop the lock upon restore
  const [localIsArchived, setLocalIsArchived] = useState(
    client.is_archived === true,
  );
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
      toast.success(
        `${client.first_name} ${client.last_name} has been restored to active clients.`,
      );
      setLocalIsArchived(false);
    } catch (err) {
      console.error("[ClientProfileDashboard] Restore failed:", err);
      toast.error(
        "Failed to restore client. Please check your connection and try again.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  // Safe initials extraction
  const initials =
    `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Archive Banner ── */}
      {isArchived && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ This client is archived. You are viewing this profile in
              Read-Only mode.
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

      {/* ── MAIN CONTENT ── */}
      <div className="space-y-6">

        {/* Back button — bare on the page background, above the Hero Card */}
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← Back to Clients
        </button>

        {/* ── Hero Card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Hero body: avatar · info stack · action — bottom border separates from content below */}
          <div className="flex items-center gap-5 px-6 py-5 border-b border-slate-100">
            {/* Avatar */}
            <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-100 ring-4 ring-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm select-none">
              {initials}
            </div>

            {/* Info stack */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight truncate">
                {client.first_name} {client.last_name}
              </h1>

              {/* Contact summary row */}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                {client.email && (
                  <div className="flex items-center gap-1">
                    {client.email}
                    <QuickCopy text={client.email} label="Email" />
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1">
                    {client.phone}
                    <QuickCopy text={client.phone} label="Phone Number" />
                  </div>
                )}
              </div>
            </div>

            {/* Action — pushed to far right, vertically centred */}
            <div className="ml-auto shrink-0">
              <button
                type="button"
                id="btn-toggle-edit-mode"
                disabled={isArchived}
                onClick={() => setIsEditable((prev) => !prev)}
                aria-pressed={isEditable && !isArchived}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
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
        </div>

        {/* Conditionally render tabs or placeholder based on edit mode */}
        {isEditable ? (
          <>
              {/* Tab bar — fluid wrapping, no horizontal scroll */}
              <nav aria-label="Client profile sections">
                <ol
                  role="tablist"
                  className="flex flex-wrap gap-2 w-full border-b border-slate-200 pb-2"
                >
                  {TABS.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <li key={tab.id} role="presentation">
                        <button
                          role="tab"
                          id={`tab-${tab.id}`}
                          aria-selected={isActive}
                          aria-controls={`tabpanel-${tab.id}`}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={[
                            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            isActive
                              ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
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

              {/* Tab panels */}
              <fieldset
                disabled={isArchived}
                className="min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              >
                <div
                  role="tabpanel"
                  id={`tabpanel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                >
                  {activeTab === "profile" && (
                    <ProfileTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                      onBack={onBack}
                    />
                  )}
                  {activeTab === "medical" && (
                    <MedicalTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                  {activeTab === "contacts" && (
                    <ContactsTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                  {activeTab === "logistics" && (
                    <LogisticsTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                  {activeTab === "questionnaire" && (
                    <QuestionnaireTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                  {activeTab === "legal" && (
                    <LegalConsentsTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                  {activeTab === "documents" && <DocumentsTab client={client} />}
                  {activeTab === "financial" && (
                    <FinancialAidTab
                      client={client}
                      isEditable={isArchived ? false : isEditable}
                    />
                  )}
                </div>
              </fieldset>
          </>
        ) : (
          /* ── Bento Box Overview Dashboard (isEditable = false) ── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Alert banner (full-width) ── */}
            <div className="lg:col-span-3 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
              {/* Check icon */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-emerald-600"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">
                  Quick Glance Alerts &amp; Notifications
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  All core client documents are currently up to date. No
                  pending actions required.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                All Clear
              </span>
            </div>

            {/* ── Timeline card (col-span-2) ── */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Activity Timeline &amp; Progress Tracking
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Client journey milestones and recorded events
                  </p>
                </div>
              </div>

              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-10">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">No activity recorded yet</p>
                <p className="text-xs text-slate-500 text-center px-4">Timeline updates will appear automatically as actions are taken.</p>
              </div>
            </div>

            {/* ── Right rail (col-span-1): Actions + Meetings stacked ── */}
            <div className="lg:col-span-1 flex flex-col gap-6">

              {/* Action Buttons card */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={isArchived}
                    onClick={() => toast.info("Meeting scheduler coming soon!")}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
                  >
                    Create Meeting
                  </button>
                  <button
                    type="button"
                    disabled={isArchived}
                    onClick={() => toast.info("Reminder feature coming soon!")}
                    className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Add Reminder
                  </button>
                  <button
                    type="button"
                    disabled={isArchived}
                    onClick={() => toast.info("Email client feature coming soon!")}
                    className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Send Email
                  </button>
                </div>
              </div>

              {/* Recent Meetings & Logs card */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Recent Meetings &amp; Logs
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Interaction history
                    </p>
                  </div>
                </div>

                {/* Empty state */}
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No meetings logged</p>
                  <p className="text-xs text-slate-500 text-center px-4">Click &lsquo;Create Meeting&rsquo; above to schedule or log an interaction.</p>
                </div>
              </div>

            </div>{/* end right rail */}

          </div>
        )}
      </div>
    </div>
  );
}
