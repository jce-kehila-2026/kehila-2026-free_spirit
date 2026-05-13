"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { ClientFormInput } from "@/schemas/clientSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Firestore document = form data + server-generated fields. */
export interface ClientDoc extends ClientFormInput {
  id: string;
  created_at?: Timestamp;
}

interface ClientListProps {
  onEdit: (client: ClientDoc) => void;
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ClientList
 *
 * Real-time table of all clients in Firestore via onSnapshot.
 * Columns: Name, Email, Phone, Status, Actions (Edit).
 */
export default function ClientList({ onEdit }: ClientListProps) {
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ClientDoc[];
        setClients(docs);
        setIsLoading(false);
      },
      (error) => {
        console.error("[ClientList] onSnapshot error:", error);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-medium text-slate-500">
          Loading clients…
        </p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (clients.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-500">
          No clients yet
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Click &quot;+ Add New Client&quot; above to create the first record.
        </p>
      </div>
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3 font-semibold text-slate-600">Name</th>
            <th className="px-5 py-3 font-semibold text-slate-600">Email</th>
            <th className="hidden px-5 py-3 font-semibold text-slate-600 sm:table-cell">
              Phone
            </th>
            <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
            <th className="px-5 py-3 text-right font-semibold text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="transition-colors hover:bg-slate-50"
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
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  id={`btn-edit-client-${client.id}`}
                  onClick={() => onEdit(client)}
                  className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
