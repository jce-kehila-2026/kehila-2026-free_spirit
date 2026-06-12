"use client";

import { useEffect, useState, useRef } from "react";
import { type Timestamp } from "firebase/firestore";
import type { ClientFormInput, FinancialAidApplication, ClientDocument } from "@/schemas/clientSchema";
import { IconArchive, IconExport } from "@/components/ui/Icons";
import ClientRow from "./ClientRow";
import FilterableHeaderCell from "./FilterableHeaderCell";

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
  /** Pre-fetched docs from parent (Tier 2 Application Layer hook) */
  externalDocs?: ClientDoc[];
  externalLoading?: boolean;
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
  onRestoreSelect: (client: ClientDoc) => void; // Tier 2 action callback passed from page
}
// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    interested: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Interested" },
    registered: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Registered" },
    draft: { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", label: "Draft" },
  };

  const c = config[status] ?? config.draft;

  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", c.bg, c.text].join(" ")}>
      {c.label}
    </span>
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
  onRestoreSelect,
}: ClientListProps) {

  // ── Column filter popover click-outside logic ───────────────────────────
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

  // ── Derived filtered list ──────────────────────────────────────────────
  const clients = showArchived
    ? (externalDocs || []).filter((c) => c.is_archived === true)
    : (externalDocs || []).filter((c) => c.is_archived !== true);

  const countText = totalActiveCount !== undefined && clients.length < totalActiveCount && !showArchived
    ? `Showing ${clients.length} of ${totalActiveCount} records`
    : `${clients.length} ${showArchived ? "archived" : "active"} record${clients.length !== 1 ? "s" : ""}`;

  
  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Table Action Utilities Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">Clients</h2>
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {countText}
          </span>
          {hasActiveFilters && onClearAllFilters && (
            <button type="button" onClick={onClearAllFilters} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Clear Filters
            </button>
          )}
        </div>
        <button type="button" onClick={onToggleArchived} className={["inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors", showArchived ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>
          <IconArchive className="h-4 w-4" /> {showArchived ? "View Active" : "View Archive"}
        </button>
      </div>

      {showArchived && (
        <div className="mb-4 m-5 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <IconArchive className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">You are viewing <span className="font-bold">archived records</span>.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead ref={theadRef}>
            <tr className={["border-b", showArchived ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"].join(" ")}>
              {(["name", "email", "phone", "status"] as const).map((col) => (
                <FilterableHeaderCell
                  key={col}
                  columnKey={col}
                  label={col.charAt(0).toUpperCase() + col.slice(1)}
                  hideOnMobile={col === "phone"}
                  openFilter={openFilter}
                  setOpenFilter={setOpenFilter}
                  columnFilters={columnFilters}
                  baseDocs={baseDocs}
                  sortConfig={sortConfig}
                  onSortChange={onSortChange}
                  onColumnFilterChange={onColumnFilterChange}
                />
              ))}
              <th className="w-10 py-3 pr-4 text-right">
                {!showArchived && onExport && (
                  <button type="button" title="Export to CSV" onClick={onExport} className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                    <IconExport className="h-4 w-4" />
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <p className="text-base font-semibold text-slate-500">{showArchived ? "No archived clients found" : "No clients found"}</p>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  showArchived={showArchived}
                  onEdit={onEdit}
                  onRestoreSelect={onRestoreSelect}
                  renderStatusBadge={(status: string) => <StatusBadge status={status} />}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}