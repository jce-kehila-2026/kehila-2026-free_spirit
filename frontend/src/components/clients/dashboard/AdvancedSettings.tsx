"use client";

interface AdvancedSettingsProps {
  isArchived: boolean;
  onArchiveTrigger: () => void;
}

export default function AdvancedSettings({ isArchived, onArchiveTrigger }: AdvancedSettingsProps) {
  return (
    <section className="mt-6 border-t border-[#D7E3D5] pt-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A6822]">Record controls</p>
      <h2 className="mt-1 text-lg font-bold text-[#15383E]">Advanced settings</h2>
      <div className="mt-4 flex flex-col gap-4 rounded-[1.5rem] border border-[#E8D6D1] bg-[#FFF9F7] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-bold text-[#5F3530]">Archive client record</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#7B625F]">
            Remove this client from the active list. Their data will be safely stored and can be restored at any time.
          </p>
        </div>
        <button
          type="button"
          disabled={isArchived}
          onClick={onArchiveTrigger}
          className="shrink-0 rounded-full border border-[#E4BDB5] bg-white px-4 py-2.5 text-sm font-bold text-[#A3483C] transition-colors hover:bg-[#FCEDEA] focus:outline-none focus:ring-2 focus:ring-[#D98D80] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isArchived ? "Already Archived" : "Archive Client"}
        </button>
      </div>
    </section>
  );
}
