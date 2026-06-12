"use client";

import { type ClientDoc } from "@/components/clients/list/ClientList";
import { IconRestore } from "@/components/ui/Icons";

interface RestoreModalProps {
  client: ClientDoc;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isRestoring: boolean;
}

export default function RestoreModal({ client, onCancel, onConfirm, isRestoring }: RestoreModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <IconRestore className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-slate-800">
          Restore {client.first_name} {client.last_name}?
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          This will move them back to the active clients list.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {isRestoring ? "Restoring…" : "Confirm Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}