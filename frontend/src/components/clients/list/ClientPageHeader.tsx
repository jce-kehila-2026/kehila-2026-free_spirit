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
    <header className="mb-6 overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] px-5 py-6 text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)] sm:px-8 sm:py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {view === "list"
              ? "Client management"
              : editingClient
                ? "Edit client"
                : "New client"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
        {view === "list" ? (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#245C66] shadow-sm transition hover:bg-[#EEF4EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D4CC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#245C66]"
          >
            <IconPlus className="h-4 w-4" />
            Add new client
          </button>
        ) : (
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to list
          </button>
        )}
        </div>
      </div>
    </header>
  );
}
