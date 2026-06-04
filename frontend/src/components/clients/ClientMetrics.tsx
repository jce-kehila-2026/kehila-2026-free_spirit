"use client";

import { useMemo, useState } from "react";
import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientMetricsProps {
  clients: ClientDoc[];
  /** Called when the user clicks a client name — navigates to their profile. */
  onOpenClient: (client: ClientDoc) => void;
}

// ─── Triage category definition ───────────────────────────────────────────────

interface TriageCategory {
  id: string;
  label: string;
  description: string;
  severity: "critical" | "warning" | "info";
  clients: ClientDoc[];
}

// ─── Accordion item ───────────────────────────────────────────────────────────

function TriageCard({
  category,
  isOpen,
  onToggle,
  onOpenClient,
}: {
  category: TriageCategory;
  isOpen: boolean;
  onToggle: () => void;
  onOpenClient: (client: ClientDoc) => void;
}) {
  const count = category.clients.length;
  const isEmpty = count === 0;

  const severityStyles = {
    critical: {
      header: isEmpty
        ? "bg-slate-50 border-slate-200"
        : "bg-red-50 border-red-200 hover:bg-red-100",
      badge: isEmpty ? "bg-slate-200 text-slate-500" : "bg-red-600 text-white",
      icon: isEmpty ? "text-slate-400" : "text-red-600",
      chevron: "text-red-400",
    },
    warning: {
      header: isEmpty
        ? "bg-slate-50 border-slate-200"
        : "bg-amber-50 border-amber-200 hover:bg-amber-100",
      badge: isEmpty ? "bg-slate-200 text-slate-500" : "bg-amber-500 text-white",
      icon: isEmpty ? "text-slate-400" : "text-amber-600",
      chevron: "text-amber-400",
    },
    info: {
      header: isEmpty
        ? "bg-slate-50 border-slate-200"
        : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      badge: isEmpty ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white",
      icon: isEmpty ? "text-slate-400" : "text-indigo-600",
      chevron: "text-indigo-400",
    },
  }[category.severity];

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* ── Header / Toggle ── */}
      <button
        type="button"
        id={`triage-toggle-${category.id}`}
        onClick={onToggle}
        disabled={isEmpty}
        aria-expanded={isOpen}
        aria-controls={`triage-body-${category.id}`}
        className={[
          "flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors duration-150",
          severityStyles.header,
          isEmpty ? "cursor-default opacity-70" : "cursor-pointer",
        ].join(" ")}
      >

        {/* Label + description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            {category.label}
          </p>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
            {category.description}
          </p>
        </div>

        {/* Count badge */}
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${severityStyles.badge}`}
        >
          {count}
        </span>

        {/* Chevron */}
        {!isEmpty && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${severityStyles.chevron} ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* ── Expanded body ── */}
      {isOpen && !isEmpty && (
        <div
          id={`triage-body-${category.id}`}
          className="border-t border-slate-100 bg-white"
        >
          <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {category.clients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  id={`triage-client-${category.id}-${client.id}`}
                  onClick={() => onOpenClient(client)}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  {/* Name */}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                    {client.first_name} {client.last_name}
                  </span>

                  {/* Status pill */}
                  <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-500 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    {client.status || "draft"}
                  </span>

                  {/* Arrow */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover:text-indigo-500"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          {/* Footer count */}
          <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
            {count} client{count !== 1 ? "s" : ""} require attention in this category
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ClientMetrics — Operational Action Required Panel
 *
 * Filters the full ClientDoc[] into 4 actionable triage buckets. Each bucket
 * is a collapsible accordion listing every client name as a clickable link
 * that opens their profile via onOpenClient.
 */
export default function ClientMetrics({ clients, onOpenClient }: ClientMetricsProps) {
  // Track which accordion panels are open (by category id)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Triage computations ───────────────────────────────────────────────
  const categories = useMemo<TriageCategory[]>(() => {
    const active = clients.filter((c) => c.is_archived !== true);

    // 1. Missing Registration — no dob, phone, or any ID field
    const missingRegistration = active.filter(
      (c) =>
        !c.dob?.trim() ||
        !c.phone?.trim() ||
        (!c.passport_id?.trim() && !c.passport_number?.trim())
    );

    // 2. Medical Not Cleared — clearance is anything other than "approved"
    const medicalNotCleared = active.filter(
      (c) =>
        !c.medical_profile?.medical_clearance_status ||
        c.medical_profile.medical_clearance_status !== "approved"
    );

    // 3. Missing Insurance — insurance_company is blank
    const missingInsurance = active.filter(
      (c) => !c.medical_profile?.insurance_company?.trim()
    );

    // 4. Missing Health History — medications, allergies, or healthcare_providers absent
    const missingHealthHistory = active.filter(
      (c) =>
        !c.medical_profile?.medications?.trim() ||
        !c.medical_profile?.allergies?.trim() ||
        !c.medical_profile?.healthcare_providers?.length
    );

    return [
    {
        id: "incomplete-profiles",
        label: "Incomplete Profiles",
        description: "No DOB, phone, or ID on file",
        severity: "critical",
        clients: missingRegistration,
      },
      {
        id: "medical-reviews-pending",
        label: "Medical Reviews Pending",
        description: "Clearance status is not approved",
        severity: "critical",
        clients: medicalNotCleared,
      },
      {
        id: "awaiting-insurance-details",
        label: "Awaiting Insurance Details",
        description: "Insurance company field is empty",
        severity: "warning",
        clients: missingInsurance,
      },
      {
        id: "missing-health-history",
        label: "Missing Health History",
        description: "Medications, allergies, or providers absent",
        severity: "info",
        clients: missingHealthHistory,
      },
    ];
  }, [clients]);

  const totalFlagged = useMemo(() => {
    // Unique flagged clients (a client may appear in multiple categories)
    const ids = new Set(categories.flatMap((c) => c.clients.map((cl) => cl.id)));
    return ids.size;
  }, [categories]);

  const activeCount = clients.filter((c) => c.is_archived !== true).length;

  return (
    <section aria-label="Operational Action Required" className="mb-6">
      {/* ── Panel header ── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="border-b border-slate-100 pb-2" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Action Required
          </h2>
        </div>
        {activeCount > 0 && (
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-600">{totalFlagged}</span> of{" "}
            {activeCount} active clients flagged
          </p>
        )}
      </div>

      {/* ── 2×2 responsive accordion grid ── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.map((cat) => (
          <TriageCard
            key={cat.id}
            category={cat}
            isOpen={openIds.has(cat.id)}
            onToggle={() => toggle(cat.id)}
            onOpenClient={onOpenClient}
          />
        ))}
      </div>
    </section>
  );
}
