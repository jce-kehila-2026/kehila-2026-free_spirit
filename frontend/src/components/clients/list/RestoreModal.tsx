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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/60 bg-[#FFFDF8] p-7 shadow-[0_24px_60px_rgba(21,56,62,0.28)] sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5F0E2]">
          <IconRestore className="h-6 w-6 text-[#3F7763]" />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]">
          Restore {client.first_name} {client.last_name}?
        </h2>
        <p className="mb-6 text-sm leading-6 text-[#5C7478]">
          This will move them back to the active clients list.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="rounded-full border border-[#D7E3D5] bg-white px-5 py-2.5 text-sm font-bold text-[#31585F] hover:bg-[#EEF4EC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="rounded-full bg-[#3F7763] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#315F50] disabled:opacity-50"
          >
            {isRestoring ? "Restoring…" : "Confirm Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
