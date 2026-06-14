"use client";

import { IconArchive } from "@/components/ui/Icons";

interface ProfileArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isArchiving: boolean;
  clientName: string;
}

export default function ProfileArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  isArchiving,
  clientName,
}: ProfileArchiveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <IconArchive className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-slate-800">Archive Profile?</h2>
        <p className="mb-6 text-sm text-slate-500">
          Are you sure you want to archive {clientName}? They will be hidden from the active workspace.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isArchiving}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isArchiving ? "Archiving..." : "Confirm Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}