import {
  CalendarDays,
  CalendarSync,
  Check,
  Clock3,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export default function EventCard({
  event,
  isActionLoading = false,
  onEdit,
  onEditSummary,
  onComplete,
  onCancel,
  onDelete,
}) {
  const isHighPriority = event.priority === "high";

  return (
    <article className="group rounded-2xl border border-[#D7E3D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F3_100%)] p-5 transition hover:border-[#9FBFB4] hover:shadow-[0_10px_24px_rgba(44,105,117,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6BB2A0]">
            Scheduled Meeting
          </p>

          <h3 className="mt-2 text-lg font-bold text-[#15383E]">
            {event.title}
          </h3>

          {event.clientName && (
            <p className="mt-1 text-sm font-semibold text-[#2C6975]">
              Participant: {event.clientName}
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isHighPriority
              ? "bg-rose-100 text-rose-700"
              : "bg-[#DCEAD6] text-[#2C6975]"
          }`}
        >
          {isHighPriority ? "Important" : "Regular"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#D7E3D5]">
          <p className="text-xs font-bold uppercase text-[#7C9194]">Date</p>
          <p className="mt-1 flex items-center gap-2 font-bold text-[#31585F]">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
            {event.date}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#D7E3D5]">
          <p className="text-xs font-bold uppercase text-[#7C9194]">Time</p>
          <p className="mt-1 flex items-center gap-2 font-bold text-[#31585F]">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
            {event.time}
          </p>
        </div>
      </div>

      {event.notes && (
        <p className="mt-4 rounded-2xl bg-[#EEF4EC] px-4 py-3 text-sm leading-6 text-[#5C7478]">
          {event.notes}
        </p>
      )}

      {onEditSummary && (
        <div className="mt-4 rounded-2xl border border-[#C9D9D1] bg-[#F3F7F1] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">
              Meeting summary
            </p>
            <button
              type="button"
              onClick={() => onEditSummary(event)}
              disabled={isActionLoading}
              className="rounded-full border border-[#BFD0CA] bg-white px-3 py-1.5 text-xs font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#EAF2EA] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {event.meetingSummary?.trim() ? "Edit summary" : "Add summary"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#5C7478]">
            {event.meetingSummary?.trim() || "No summary added yet."}
          </p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[#D7E3D5] pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7C9194]">
          Status
        </p>

        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            event.status === "completed"
              ? "bg-emerald-100 text-emerald-700"
              : event.status === "cancelled"
              ? "bg-amber-100 text-amber-700"
              : event.status === "deleted"
              ? "bg-slate-100 text-slate-500"
              : "bg-blue-100 text-blue-700"
          }`}>
          {event.status || "scheduled"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#E4F0EC] px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#4E807F]">
          <CalendarSync aria-hidden="true" className="h-4 w-4" />
          Calendar sync
        </p>

        <span className="rounded-full bg-white px-3 py-1 text-right text-xs font-bold text-[#2C6975]">
          {event.calendarSyncLabel || "Not synced to calendar yet"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
       {event.status === "scheduled" && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(event)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-full bg-[#2C6975] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit
          </button>
        )}

        {event.status === "scheduled" && (
          <>
            <button
              type="button"
              onClick={() => onComplete(event.id)}
              disabled={isActionLoading}
              className="inline-flex items-center gap-2 rounded-full bg-[#4F8B75] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#3F7763] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              Complete
            </button>

            <button
              type="button"
              onClick={() => onCancel(event.id)}
              disabled={isActionLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[#D6C898] bg-[#FFF8DF] px-4 py-2 text-sm font-bold text-[#80691B] transition hover:bg-[#F8EDC7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Cancel
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onDelete(event.id)}
          disabled={isActionLoading}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}
