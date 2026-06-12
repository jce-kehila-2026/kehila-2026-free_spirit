"use client";

interface AdvancedSettingsProps {
  isArchived: boolean;
  onArchiveTrigger: () => void;
}

export default function AdvancedSettings({ isArchived, onArchiveTrigger }: AdvancedSettingsProps) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Advanced Settings</h2>
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-6 mt-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-900">Archive Client Record</p>
          <p className="text-sm text-slate-500 mt-1">
            Remove this client from the active list. Their data will be safely stored and can be restored at any time.
          </p>
        </div>
        <button
          type="button"
          disabled={isArchived}
          onClick={onArchiveTrigger}
          className="ml-6 shrink-0 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isArchived ? "Already Archived" : "Archive Client"}
        </button>
      </div>
    </div>
  );
}