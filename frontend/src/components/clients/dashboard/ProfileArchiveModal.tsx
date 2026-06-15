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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/60 bg-[#FFFDF8] p-7 shadow-[0_24px_60px_rgba(21,56,62,0.28)] sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCEDEA]">
          <IconArchive className="h-6 w-6 text-[#A3483C]" />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]">Archive profile?</h2>
        <p className="mb-6 text-sm leading-6 text-[#5C7478]">
          Are you sure you want to archive {clientName}? They will be hidden from the active workspace.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="rounded-full border border-[#D7E3D5] px-5 py-2.5 text-sm font-bold text-[#31585F] hover:bg-[#EEF4EC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isArchiving}
            className="rounded-full bg-[#A3483C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#843A31] disabled:opacity-50"
          >
            {isArchiving ? "Archiving..." : "Confirm Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
