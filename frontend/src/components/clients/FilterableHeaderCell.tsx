"use client";

import { type ClientDoc } from "@/components/clients/ClientList";
import { IconFunnel, IconSortAsc, IconSortDesc } from "@/components/ui/Icons";

interface FilterableHeaderCellProps {
  columnKey: "name" | "email" | "phone" | "status";
  label: string;
  hideOnMobile?: boolean;
  openFilter: string | null;
  setOpenFilter: (key: "name" | "email" | "phone" | "status" | null) => void;
  columnFilters: Record<string, { text: string; values: string[] }> | undefined;
  baseDocs: ClientDoc[] | undefined;
  sortConfig: { key: string; direction: "asc" | "desc" } | null | undefined;
  onSortChange: ((config: { key: string; direction: "asc" | "desc" } | null) => void) | undefined;
  onColumnFilterChange: ((col: string, update: Partial<{ text: string; values: string[] }>) => void) | undefined;
}

export default function FilterableHeaderCell({
  columnKey,
  label,
  hideOnMobile = false,
  openFilter,
  setOpenFilter,
  columnFilters,
  baseDocs,
  sortConfig,
  onSortChange,
  onColumnFilterChange,
}: FilterableHeaderCellProps) {
  const isFilterOpen = openFilter === columnKey;
  const filterState = columnFilters?.[columnKey] || { text: "", values: [] };
  const iconActive = !!filterState.text || sortConfig?.key === columnKey;

  const uniqueValues = Array.from(
    new Set(
      (baseDocs || []).map((c) => {
        if (columnKey === "name") return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
        return (c[columnKey as keyof ClientDoc] as string) || "";
      }).filter(Boolean)
    )
  ).sort();

  function formatCheckboxLabel(val: string) {
    if (columnKey !== "status") return val;
    if (val === "in_progress" || val === "draft") return "Draft";
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  return (
    <th className={["px-5 py-3 font-semibold text-slate-600 relative", hideOnMobile ? "hidden sm:table-cell" : ""].join(" ")}>
      <div className="flex items-center gap-1.5">
        {label}
        <button
          type="button"
          onClick={() => setOpenFilter(isFilterOpen ? null : columnKey)}
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
              onClick={() => { onSortChange?.({ key: columnKey, direction: "asc" }); setOpenFilter(null); }}
              className={["flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-slate-50", sortConfig?.key === columnKey && sortConfig.direction === "asc" ? "text-indigo-600" : "text-gray-700"].join(" ")}
            >
              <IconSortAsc /> Sort A to Z
            </button>
            <button
              type="button"
              onClick={() => { onSortChange?.({ key: columnKey, direction: "desc" }); setOpenFilter(null); }}
              className={["flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-slate-50", sortConfig?.key === columnKey && sortConfig.direction === "desc" ? "text-indigo-600" : "text-gray-700"].join(" ")}
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
                  onColumnFilterChange?.(columnKey, { text: "", values: [] });
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
              onChange={(e) => onColumnFilterChange?.(columnKey, { text: e.target.value })}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="mb-3 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />

            {uniqueValues.length > 0 && (
              <>
                <div className="max-h-40 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/50 p-2">
                  <div className="mb-2 border-b border-slate-200 pb-2">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={filterState.values.length === uniqueValues.length && uniqueValues.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onColumnFilterChange?.(columnKey, { values: uniqueValues });
                          } else {
                            onColumnFilterChange?.(columnKey, { values: [] });
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="leading-tight text-sm font-normal text-gray-700">(Select All)</span>
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
                            onColumnFilterChange?.(columnKey, { values: newValues });
                          }}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="leading-tight text-sm font-normal text-gray-700">{formatCheckboxLabel(val)}</span>
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