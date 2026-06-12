import { IconPlus, IconArrowLeft } from "@/components/ui/Icons";
import { type ClientDoc } from "@/components/clients/list/ClientList";

type View = "list" | "form" | "dashboard";

interface ClientPageHeaderProps {
  view: View;
  editingClient: ClientDoc | null;
  onAddNew: () => void;
  onBackToList: () => void;
}

export default function ClientPageHeader({
  view,
  editingClient,
  onAddNew,
  onBackToList,
}: ClientPageHeaderProps) {
  if (view === "dashboard") return null;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Page title */}
      <h1 className="text-2xl font-bold text-slate-800">
        {view === "list"
          ? "Client Management"
          : editingClient
          ? "Edit Client"
          : "New Client"}
      </h1>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {view === "list" ? (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
          >
            <IconPlus className="h-4 w-4" />
            Add New Client
          </button>
        ) : (
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to List
          </button>
        )}
      </div>
    </div>
  );
}