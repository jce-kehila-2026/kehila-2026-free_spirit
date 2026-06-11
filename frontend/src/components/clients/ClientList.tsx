"use client";

import { useEffect, useState, useRef } from "react";
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
import { Eye } from "lucide-react";
import type { ClientFormInput, FinancialAidApplication, ClientDocument } from "@/schemas/clientSchema";
import { QuickCopy } from "@/components/ui/QuickCopy";

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
  columnFilters?: Record<string, { text: string; values: string[] }>;
  onColumnFilterChange?: (col: string, update: Partial<{ text: string; values: string[] }>) => void;
  baseDocs?: ClientDoc[];
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  onSortChange?: (config: { key: string; direction: "asc" | "desc" } | null) => void;
  totalActiveCount?: number;
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
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

function IconFunnel({ active }: { active?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={["h-3 w-3 transition-colors", active ? "text-indigo-600" : "text-slate-400"].join(" ")}
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

// ─── Sort icons ───────────────────────────────────────────────────────────

function IconSortAsc() {
  return (
    <div className="flex w-5 items-center gap-0.5">
      <div className="flex flex-col text-[9px] font-extrabold leading-[9px]">
        <span className="text-indigo-600">A</span>
        <span className="text-slate-800">Z</span>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
        <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

function IconSortDesc() {
  return (
    <div className="flex w-5 items-center gap-0.5">
      <div className="flex flex-col text-[9px] font-extrabold leading-[9px]">
        <span className="text-slate-800">Z</span>
        <span className="text-indigo-600">A</span>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
        <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
      </svg>
    </div>
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
export default function ClientList({
  onEdit,
  externalDocs,
  externalLoading,
  onDocsChange,
  showArchived,
  onToggleArchived,
  onExport,
  columnFilters,
  onColumnFilterChange,
  baseDocs,
  sortConfig,
  onSortChange,
  totalActiveCount,
  onClearAllFilters,
  hasActiveFilters,
}: ClientListProps) {
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

  // ── Column filter popover state ────────────────────────────────────────
  const [openFilter, setOpenFilter] = useState<"name" | "email" | "phone" | "status" | null>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (theadRef.current && !theadRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    if (openFilter) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openFilter]);

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

  // ── Count logic ────────────────────────────────────────────────────────
  const countText =
    totalActiveCount !== undefined && clients.length < totalActiveCount && !showArchived
      ? `Showing ${clients.length} of ${totalActiveCount} records`
      : `${clients.length} ${showArchived ? "archived" : "active"} record${clients.length !== 1 ? "s" : ""}`;

  // ── Column Header Helper ───────────────────────────────────────────────
  function renderColumnHeader(key: "name" | "email" | "phone" | "status", label: string, hideOnMobile = false) {
    const isFilterOpen = openFilter === key;
    const filterState = columnFilters?.[key] || { text: "", values: [] };
    const iconActive = !!filterState.text || sortConfig?.key === key;

    // Extract unique values for checklist (from un-column-filtered baseDocs)
    const uniqueValues = Array.from(new Set(
      (baseDocs || []).map((c) => {
        if (key === "name") return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
        return (c[key as keyof ClientDoc] as string) || "";
      }).filter(Boolean)
    )).sort();

    function formatCheckboxLabel(val: string) {
      if (key !== "status") return val;
      if (val === "in_progress" || val === "draft") return "Draft";
      return val.charAt(0).toUpperCase() + val.slice(1);
    }

    return (
      <th className={["px-5 py-3 font-semibold text-slate-600 relative", hideOnMobile ? "hidden sm:table-cell" : ""].join(" ")}>
        <div className="flex items-center gap-1.5">
          {label}
          <button
            type="button"
            onClick={() => setOpenFilter(isFilterOpen ? null : key)}
            className={["rounded p-1 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200", iconActive ? "bg-indigo-50" : ""].join(" ")}
            aria-label={`Filter and sort ${label}`}
          >
            <IconFunnel active={iconActive} />
          </button>
        </div>

        {isFilterOpen && (
          <div className="absolute left-5 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
            {/* Sort options */}
            <div className="border-b border-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => { onSortChange?.({ key, direction: "asc" }); setOpenFilter(null); }}
                className={["flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-slate-50", sortConfig?.key === key && sortConfig.direction === "asc" ? "text-indigo-600" : "text-gray-700"].join(" ")}
              >
                <IconSortAsc /> Sort A to Z
              </button>
              <button
                type="button"
                onClick={() => { onSortChange?.({ key, direction: "desc" }); setOpenFilter(null); }}
                className={["flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-slate-50", sortConfig?.key === key && sortConfig.direction === "desc" ? "text-indigo-600" : "text-gray-700"].join(" ")}
              >
                <IconSortDesc /> Sort Z to A
              </button>
            </div>

            {/* Filter options */}
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter</span>
                <button
                  type="button"
                  onClick={() => {
                    onColumnFilterChange?.(key, { text: "", values: [] });
                    setOpenFilter(null);
                  }}
                  className="text-xs font-medium text-indigo-600 focus:outline-none hover:text-indigo-800"
                >
                  Clear All
                </button>
              </div>

              <input
                type="text"
                autoFocus
                value={filterState.text}
                onChange={(e) => onColumnFilterChange?.(key, { text: e.target.value })}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="mb-3 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />

              {uniqueValues.length > 0 && (
                <>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/50 p-2">
                    {/* Select All */}
                    <div className="mb-2 border-b border-slate-200 pb-2">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={filterState.values.length === uniqueValues.length && uniqueValues.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onColumnFilterChange?.(key, { values: uniqueValues });
                            } else {
                              onColumnFilterChange?.(key, { values: [] });
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="leading-tight text-sm font-normal text-gray-700">
                          (Select All)
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      {uniqueValues.map((val) => (
                        <label key={val} className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={filterState.values.includes(val)}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...filterState.values, val]
                                : filterState.values.filter((v) => v !== val);
                              onColumnFilterChange?.(key, { values: newValues });
                            }}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span 
                            className="leading-tight text-sm font-normal text-gray-700">{formatCheckboxLabel(val)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setOpenFilter(null)}
                      className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Apply Filter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </th>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Count + archive toggle ── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            {countText}
          </span>
          {hasActiveFilters && onClearAllFilters && (
            <>
              <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onClearAllFilters}
                className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800 focus:outline-none"
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
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

      {/* ── Table ── */}
      <div
        className={[
          "rounded-xl border shadow-sm",
          showArchived
            ? "border-amber-200 bg-amber-50/30"
            : "border-slate-200 bg-white",
        ].join(" ")}
      >
        <table className="w-full text-left text-sm">
          <thead ref={theadRef}>
            <tr
              className={[
                "border-b",
                showArchived
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-100 bg-slate-50",
              ].join(" ")}
            >
              {renderColumnHeader("name", "Name")}
              {renderColumnHeader("email", "Email")}
              {renderColumnHeader("phone", "Phone", true)}
              {renderColumnHeader("status", "Status")}
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
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <p className="text-base font-semibold text-slate-500">
                    {showArchived ? "No archived clients found" : "No clients found"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Try adjusting your column filters or search query.
                  </p>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className={[
                    "transition-colors",
                    showArchived ? "hover:bg-amber-50" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span>{client.first_name} {client.last_name}</span>
                      <QuickCopy text={`${client.first_name} ${client.last_name}`} label="Name" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span>{client.email}</span>
                      {client.email && <QuickCopy text={client.email} label="Email" />}
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-600 sm:table-cell">
                    <div className="flex items-center justify-between gap-2">
                      <span>{client.phone}</span>
                      {client.phone && <QuickCopy text={client.phone} label="Phone Number" />}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="w-10 py-3.5 pr-4 text-right">
                    {showArchived ? (
                      <div className="flex items-center justify-end gap-2">
                        {/* View Profile button */}
                        <button
                          type="button"
                          title="View Profile"
                          id={`btn-view-archived-client-${client.id}`}
                          onClick={() => onEdit(client)}
                          aria-label={`View ${client.first_name} ${client.last_name}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Restore button */}
                        <button
                          type="button"
                          id={`btn-restore-client-${client.id}`}
                          onClick={() => setRestoreTarget(client)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          <IconRestore />
                          Restore
                        </button>
                      </div>
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
