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

      {/* ── SPLIT SCREEN LAYOUT WRAPPER ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {/* ── LEFT COLUMN: Sticky Profile Sidebar (col-span-1) ── */}
        <div className="col-span-1 md:sticky md:top-4 h-fit flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">

            {/* ── Avatar & Basic Info ── */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="h-20 w-20 rounded-full bg-indigo-100 ring-4 ring-indigo-50 flex items-center justify-center text-2xl font-bold text-indigo-700 mb-3 shadow-sm">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {client.first_name} {client.last_name}
              </h2>
              <span
                className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full ${isArchived ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}
              >
                {isArchived ? "Archived" : "Active"}
              </span>
            </div>

            {/* ── Contact Details (icon rows) ── */}
            <div className="py-5 space-y-3 border-b border-slate-100">
              {/* Email row */}
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400" aria-hidden="true">
                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="text-sm text-slate-800 truncate">{client.email || "N/A"}</p>
                </div>
              </div>

              {/* Phone row */}
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400" aria-hidden="true">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="text-sm text-slate-800">{client.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* ── Action Button Stack ── */}
            <div className="pt-5 flex flex-col gap-2.5">
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
        </div>

        {/* ── RIGHT COLUMN: Main Content & Tabs (col-span-3) ── */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          {/* Back button, title, and Edit/View toggle */}
          <div className="flex flex-col items-start bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
                Client Profile
              </h1>

              {/* View / Edit mode toggle button */}
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

          {/* Conditionally render tabs or placeholder based on edit mode */}
          {isEditable ? (
            <>
              {/* Tab bar */}
              <nav aria-label="Client profile sections" className="overflow-x-auto">
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

              {/* ── CARD 3 (full-width, rendered first at top): Quick Glance Alerts ── */}
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

              {/* ── CARD 1 (col-span-2): Activity Timeline & Progress Tracking ── */}
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
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-500 ring-1 ring-indigo-100">
                    Integration Pending
                  </span>
                </div>

                {/* Timeline skeleton */}
                <ol className="relative border-l-2 border-dashed border-slate-200 ml-2 space-y-6">
                  {[
                    { label: "Initial intake assessment completed", date: "Placeholder date", color: "bg-indigo-300" },
                    { label: "Medical questionnaire submitted", date: "Placeholder date", color: "bg-violet-300" },
                    { label: "First meeting scheduled", date: "Placeholder date", color: "bg-sky-300" },
                  ].map((item, i) => (
                    <li key={i} className="ml-5">
                      <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${item.color} ring-2 ring-white`} />
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="h-3 w-56 rounded-full bg-slate-100 mb-1.5" />
                          <p className="text-xs text-slate-400 italic">
                            {item.label}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-300 mt-0.5">
                          {item.date}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>

                <p className="mt-6 text-center text-xs text-slate-300 italic">
                  Timeline Component Integration Pending
                </p>
              </div>

              {/* ── CARD 2 (col-span-1): Recent Meetings & Logs ── */}
              <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Recent Meetings &amp; Logs
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Interaction history
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-500 ring-1 ring-violet-100">
                    Integration Pending
                  </span>
                </div>

                {/* Meeting list skeleton */}
                <ul className="flex flex-col gap-3 flex-1">
                  {[
                    { icon: "🗓️", title: "Initial Consultation", meta: "Pending date • 60 min" },
                    { icon: "📋", title: "Case Review Session", meta: "Pending date • 45 min" },
                    { icon: "📞", title: "Follow-up Call", meta: "Pending date • 20 min" },
                  ].map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <span className="text-lg leading-none">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="h-2.5 w-32 rounded-full bg-slate-200 mb-1" />
                        <p className="text-xs text-slate-400 truncate">
                          {m.meta}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-center text-xs text-slate-300 italic">
                  Meeting Summary Dashboard (Integration Pending)
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
