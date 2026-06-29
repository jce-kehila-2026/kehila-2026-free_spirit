"use client";

import { useEffect, useState, useRef } from "react";
import { type Timestamp } from "firebase/firestore";
import type { ClientFormInput, ClientDocument } from "@/schema/clientSchema";
import { IconArchive, IconExport } from "@/components/ui/Icons";
import ClientRow from "./ClientRow";
import FilterableHeaderCell from "./FilterableHeaderCell";
import { type ProgramSummary } from "@/firebase/clientDbService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientDoc extends ClientFormInput {
  id: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;

  client_documents?: ClientDocument[];
}

interface ClientListProps {
  onEdit: (client: ClientDoc) => void;
  externalDocs?: ClientDoc[];
  externalLoading?: boolean;
  showArchived: boolean;
  onToggleArchived: () => void;
  onExport?: () => void;
  columnFilters?: Record<string, { text: string; values: string[] }>;
  onColumnFilterChange?: (col: string, update: Partial<{ text: string; values: string[] }>) => void;
  baseDocs?: ClientDoc[];
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  onSortChange?: (config: { key: string; direction: "asc" | "desc" } | null) => void;
  totalActiveCount?: number;
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
  onRestoreSelect: (client: ClientDoc) => void;
  programMap: Record<string, ProgramSummary>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    interested: { bg: "bg-[#F7EED8] border-[#E5C97D]", text: "text-[#8A6822]", label: "Interested" },
    invited: { bg: "bg-[#EEF5F7] border-[#B9CFCA]", text: "text-[#245C66]", label: "Invited" },
    registered: { bg: "bg-[#E5F0E2] border-[#C5DDC0]", text: "text-[#3F7763]", label: "Registered" },
    draft: { bg: "bg-[#EEF5F7] border-[#C9DDE1]", text: "text-[#527078]", label: "Draft" },
  };

  const c = config[status] ?? config.draft;

  return (
    <span className={["inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold", c.bg, c.text].join(" ")}>
      {c.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  programMap,
}: ClientListProps) {

  const [openFilter, setOpenFilter] = useState<"name" | "email" | "phone" | "status" | "programs" | null>(null);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openClientId = params.get('openClientId');

    if (openClientId && externalDocs && externalDocs.length > 0) {
      const clientToOpen = externalDocs.find((c) => c.id === openClientId);
      
      if (clientToOpen) {
        setTimeout(() => {
          onEdit(clientToOpen);
        }, 0);
        
        window.history.replaceState(null, '', '/clients');
      }
    }
  }, [externalDocs, onEdit]);

  const clients = showArchived
    ? (externalDocs || []).filter((c) => c.is_archived === true)
    : (externalDocs || []).filter((c) => c.is_archived !== true);

  const countText = totalActiveCount !== undefined && clients.length < totalActiveCount && !showArchived
    ? `Showing ${clients.length} of ${totalActiveCount} records`
    : `${clients.length} ${showArchived ? "archived" : "active"} record${clients.length !== 1 ? "s" : ""}`;

  const uniqueProgramNames = Array.from(new Set(Object.values(programMap).map(p => p.name || "Unnamed Program"))).sort();
  const programFilterOptions = ["(Has Program)", "(No Program Assigned)", ...uniqueProgramNames];

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
      {/* ── Table Action Utilities Header (Sitting flat on the page background) ── */}
      <div className="flex flex-col gap-3 border-b border-[#D7E3D5] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E]">Client records</h2>
          </div>
          <span className="hidden rounded-full bg-[#EEF4EC] px-3 py-1 text-xs font-bold text-[#527078] sm:inline-flex">
            {countText}
          </span>
          {hasActiveFilters && onClearAllFilters && (
            <button type="button" onClick={onClearAllFilters} className="text-xs font-bold text-[#2C6975] transition-colors hover:text-[#173A40]">
              Clear filters
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={onToggleArchived} 
            className={[
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition shadow-sm",
              showArchived 
                ? "border-[#E5C97D] bg-[#F7EED8] text-[#8A6822] hover:bg-[#F1E3BF]"
                : "border-[#D7E3D5] bg-white text-[#31585F] hover:bg-[#EEF4EC]"
            ].join(" ")}
          >
            <IconArchive className="h-4 w-4" /> 
            {showArchived ? "View Active" : "View Archive"}
          </button>
        </div>
      </div>

      {/* ── Table Container Card (White border closes cleanly around the list) ── */}
      <div>
        {showArchived && (
          <div className="m-5 flex items-center gap-2.5 rounded-2xl border border-[#E5C97D] bg-[#F7EED8] px-4 py-3 sm:mx-7">
            <IconArchive className="h-4 w-4 shrink-0 text-[#9A7528]" />
            <p className="text-sm font-medium text-[#785B20]">You are viewing <span className="font-bold">archived records</span>.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#5C7478]">
            <thead ref={theadRef}>
              <tr className={["border-b", showArchived ? "border-[#E5C97D] bg-[#FBF5E8]" : "border-[#D7E3D5] bg-[#F7FAF5]"].join(" ")}>
                {(["name", "email", "phone"] as const).map((col) => (
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

                <FilterableHeaderCell
                  key="programs"
                  columnKey="programs"
                  label="Programs"
                  hideOnMobile={false}
                  openFilter={openFilter}
                  setOpenFilter={setOpenFilter}
                  columnFilters={columnFilters}
                  baseDocs={baseDocs}
                  sortConfig={sortConfig}
                  onSortChange={onSortChange}
                  onColumnFilterChange={onColumnFilterChange}
                  customValues={programFilterOptions}
                />

                <FilterableHeaderCell
                  key="status"
                  columnKey="status"
                  label="Status"
                  hideOnMobile={false}
                  openFilter={openFilter}
                  setOpenFilter={setOpenFilter}
                  columnFilters={columnFilters}
                  baseDocs={baseDocs}
                  sortConfig={sortConfig}
                  onSortChange={onSortChange}
                  onColumnFilterChange={onColumnFilterChange}
                />
                
                {/* ── Minimalist Export Icon button rendered in both view modes ── */}
              <th className="w-12 py-3 pr-4 text-right vertical-middle">
                {!showArchived && onExport && (
                  <button 
                    type="button" 
                    title="Export to CSV" 
                    onClick={onExport} 
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    <IconExport className="h-4 w-4" />
                  </button>
                )}
              </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4ECE2]">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] px-6 py-10">
                    <p className="text-base font-bold text-[#31585F]">
                      {showArchived ? "No archived clients found" : "No clients found"}
                    </p>
                    <p className="mt-2 text-sm text-[#607B80]">
                      {showArchived ? "Archived records will appear here." : "Try adjusting the search or status filters."}
                    </p>
                    </div>
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
                    programMap={programMap}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
