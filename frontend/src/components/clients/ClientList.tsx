"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { toast } from "sonner";
import type { ClientFormInput, FinancialAidApplication, ClientDocument } from "@/schemas/clientSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Firestore document = form data + server-generated fields. */
export interface ClientDoc extends ClientFormInput {
  id: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  /** Financial aid applications — stored as a top-level array on the document. */
  financial_aid_applications?: FinancialAidApplication[];
  /** Uploaded document records — stored as a top-level array on the document. */
  client_documents?: ClientDocument[];
}

interface ClientListProps {
  onEdit: (client: ClientDoc) => void;
  /** Optional: pre-fetched docs from parent. If omitted, ClientList manages its own subscription. */
  externalDocs?: ClientDoc[];
  externalLoading?: boolean;
  /** Called whenever the internal subscription updates — lets the parent mirror the data. */
  onDocsChange?: (docs: ClientDoc[]) => void;
  /** Controlled from the page-level action bar. */
  showArchived: boolean;
  onToggleArchived: () => void;
  /** Called when the user clicks the Export CSV button in the table header. */
  onExport?: () => void;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    interested: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      label: "Interested",
    },
    registered: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      label: "Registered",
    },
    draft: {
      bg: "bg-slate-50 border-slate-200",
      text: "text-slate-600",
      label: "Draft",
    },
  };

  const c = config[status] ?? config.draft;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        c.bg,
        c.text,
      ].join(" ")}
    >
      {c.label}
    </span>
  );
}

// ─── Restore icon ─────────────────────────────────────────────────────────────

function IconRestore() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.793 2.232a.75.75 0 01-.025 1.06L6.107 5h6.143a3.75 3.75 0 010 7.5H6a.75.75 0 010-1.5h6.25a2.25 2.25 0 000-4.5H6.107l1.66 1.72a.75.75 0 11-1.084 1.036L4.197 6.32a.75.75 0 010-1.037l2.486-2.575a.75.75 0 011.11.524z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Funnel filter icon (decorative, Excel-style) ──────────────────────────────────

function IconFunnel() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3 w-3 text-slate-400"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 9 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L3.659 6.22A2.25 2.25 0 0 1 3 4.629V2.34a.75.75 0 0 1 .628-.74Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Pencil (edit) icon ──────────────────────────────────────────────────────────

function IconPencil() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
    </svg>
  );
}

// ─── Restore Confirmation Modal ───────────────────────────────────────────────

interface RestoreModalProps {
  client: ClientDoc;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isRestoring: boolean;
}

function RestoreModal({ client, onCancel, onConfirm, isRestoring }: RestoreModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-6 w-6 text-emerald-600"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.793 2.232a.75.75 0 01-.025 1.06L6.107 5h6.143a3.75 3.75 0 010 7.5H6a.75.75 0 010-1.5h6.25a2.25 2.25 0 000-4.5H6.107l1.66 1.72a.75.75 0 11-1.084 1.036L4.197 6.32a.75.75 0 010-1.037l2.486-2.575a.75.75 0 011.11.524z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {/* Title */}
        <h2
          id="restore-modal-title"
          className="mb-2 text-lg font-bold text-slate-800"
        >
          Restore {client.first_name} {client.last_name}?
        </h2>
        {/* Description */}
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          This will move them back to the active clients list.
        </p>
        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            id="btn-restore-cancel"
            onClick={onCancel}
            disabled={isRestoring}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-restore-confirm"
            onClick={onConfirm}
            disabled={isRestoring}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRestoring ? "Restoring…" : "Confirm Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ClientList
 *
 * Real-time table of all clients in Firestore via onSnapshot.
 * Supports toggling between "Active Clients" and "Archived Records" views.
 * In archived view, the Edit button is replaced with a Restore button that
 * sets is_archived: false on the Firestore document.
 *
 * Columns: Name, Email, Phone, Status, Actions.
 */
export default function ClientList({ onEdit, externalDocs, externalLoading, onDocsChange, showArchived, onToggleArchived, onExport }: ClientListProps) {
  // ── All raw docs from Firestore (unfiltered) ───────────────────────────
  const [internalDocs, setInternalDocs] = useState<ClientDoc[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  // Use external data when provided, otherwise fall back to the internal subscription
  const allDocs = externalDocs ?? internalDocs;
  const isLoading = externalLoading ?? internalLoading;

  // ── View mode (controlled by parent) ───────────────────────────────────

  // ── Restore modal state ────────────────────────────────────────────────
  const [restoreTarget, setRestoreTarget] = useState<ClientDoc | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // ── Firestore subscription (only runs when no external docs provided) ──
  useEffect(() => {
    // If the parent is managing data externally, skip the internal subscription
    if (externalDocs !== undefined) return;

    const q = query(collection(db, "clients"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ClientDoc[];
        setInternalDocs(docs);
        setInternalLoading(false);
        onDocsChange?.(docs);
      },
      (error) => {
        console.error("[ClientList] onSnapshot error:", error);
        setInternalLoading(false);
      }
    );

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived filtered list ──────────────────────────────────────────────
  // Active:   is_archived is false OR the field simply doesn't exist yet (legacy docs).
  // Archived: is_archived is explicitly true.
  const clients = showArchived
    ? allDocs.filter((c) => c.is_archived === true)
    : allDocs.filter((c) => c.is_archived !== true);

  // ── Restore handler ────────────────────────────────────────────────────
  async function handleRestore() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const docRef = doc(db, "clients", restoreTarget.id);
      await updateDoc(docRef, {
        is_archived: false,
        updated_at: serverTimestamp(),
      });
      toast.success(
        `${restoreTarget.first_name} ${restoreTarget.last_name} has been restored to active clients.`
      );
      setRestoreTarget(null);
    } catch (err) {
      console.error("[ClientList] Restore failed:", err);
      toast.error("Failed to restore client. Please check your connection and try again.");
    } finally {
      setIsRestoring(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-medium text-slate-500">Loading clients…</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Count + archive toggle ── */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">
          {clients.length} {showArchived ? "archived" : "active"} record{clients.length !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
        <button
          type="button"
          id="btn-view-archived-records-alt"
          onClick={onToggleArchived}
          className={[
            "text-xs font-medium transition-colors focus:outline-none",
            showArchived
              ? "text-amber-500 hover:text-amber-700"
              : "text-slate-400 hover:text-slate-600",
          ].join(" ")}
        >
          {showArchived ? "← Active Clients" : "View Archive"}
        </button>
      </div>

      {/* ── Archived mode banner ── */}
      {showArchived && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true">
            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" />
            <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5zm5.5 2.5a.5.5 0 01.5-.5h4a.5.5 0 010 1H8a.5.5 0 01-.5-.5z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-amber-800">
            You are viewing <span className="font-bold">archived records</span>. These clients
            have been removed from the active list but their data is safely preserved.
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {clients.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-500">
            {showArchived ? "No archived clients" : "No clients yet"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {showArchived
              ? "Clients you archive will appear here."
              : "Click \"+ Add New Client\" above to create the first record."}
          </p>
        </div>
      ) : (
        /* ── Table ── */
        <div
          className={[
            "overflow-hidden rounded-xl border shadow-sm",
            showArchived
              ? "border-amber-200 bg-amber-50/30"
              : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className={[
                  "border-b",
                  showArchived
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-100 bg-slate-50",
                ].join(" ")}
              >
                <th className="px-5 py-3 font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    Name <IconFunnel />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    Email <IconFunnel />
                  </span>
                </th>
                <th className="hidden px-5 py-3 font-semibold text-slate-600 sm:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    Phone <IconFunnel />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    Status <IconFunnel />
                  </span>
                </th>
                {/* Last column: export icon (active view) or empty (archive view) */}
                <th className="w-10 py-3 pr-4 text-right">
                  {!showArchived && onExport && (
                    <button
                      type="button"
                      title="Export to CSV"
                      aria-label="Export filtered clients to CSV"
                      onClick={onExport}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                      </svg>
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={[
                    "transition-colors",
                    showArchived ? "hover:bg-amber-50" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
                    {client.first_name} {client.last_name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{client.email}</td>
                  <td className="hidden px-5 py-3.5 text-slate-600 sm:table-cell">
                    {client.phone}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="w-10 py-3.5 pr-4 text-right">
                    {showArchived ? (
                      /* Restore button */
                      <button
                        type="button"
                        id={`btn-restore-client-${client.id}`}
                        onClick={() => setRestoreTarget(client)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <IconRestore />
                        Restore
                      </button>
                    ) : (
                      /* Edit button — pencil icon only */
                      <button
                        type="button"
                        title="Edit"
                        id={`btn-edit-client-${client.id}`}
                        onClick={() => onEdit(client)}
                        aria-label={`Edit ${client.first_name} ${client.last_name}`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <IconPencil />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Restore confirmation modal ── */}
      {restoreTarget && (
        <RestoreModal
          client={restoreTarget}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={handleRestore}
          isRestoring={isRestoring}
        />
      )}
    </>
  );
}
