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
    <header className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#2C6975] px-5 py-4 text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)] sm:px-6 sm:py-5">
      <div
        aria-hidden="true"
        className="absolute -left-20 -top-24 h-72 w-72 rounded-full border-[48px] border-[#6BB2A0]/25"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-3xl text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
            {view === "list"
              ? "Client management"
              : editingClient
                ? "Edit client"
                : "New client"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/78">
            {view === "list"
              ? "Manage client records, details, and follow-up information."
              : "Add a new client to the system."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {view === "list" ? (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-sm font-bold text-[#15383E] shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D4CC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#245C66]"
          >
            <IconPlus className="h-4 w-4" />
            Add new client
          </button>
        ) : (
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
