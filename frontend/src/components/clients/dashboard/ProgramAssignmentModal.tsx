"use client";

import ClientProgramsWidget from "@/components/clients/dashboard/ClientProgramsWidget";

interface ProgramAssignmentModalProps {
  clientId: string;
  programIds: string[];
  onClose: () => void;
}

/**
 * Modal wrapper for the ClientProgramsWidget.
 * Triggered from the "Assign to Program" item in the Timeline Actions dropdown.
 */
export default function ProgramAssignmentModal({
  clientId,
  programIds,
  onClose,
}: ProgramAssignmentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Close when clicking the backdrop (not the modal card itself)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-[1.75rem] border border-white/50 bg-[#F3F6F0] shadow-[0_24px_60px_rgba(21,56,62,0.28)] overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#F3F6F0] px-6 py-4 border-b border-[#D7E3D5]">
          <div>
            <h2 className="text-base font-bold text-[#15383E]">Client&apos;s Programs</h2>
            <p className="mt-0.5 text-xs text-[#6A8589]">Assign or remove this client from programs.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-[#6A8589] transition hover:bg-white hover:text-[#173A40]"
            aria-label="Close program assignment modal"
          >
            &times;
          </button>
        </div>

        {/* ── Widget Body ── */}
        <div className="p-4">
          <ClientProgramsWidget
            clientId={clientId}
            programIds={programIds}
          />
        </div>

      </div>
    </div>
  );
}
