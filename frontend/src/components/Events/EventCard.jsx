export default function EventCard({
  event,
  isActionLoading = false,
  onComplete,
  onCancel,
  onDelete,
}) {
  const isHighPriority = event.priority === "high";

  return (
    <article className="group rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            Scheduled Meeting
          </p>

          <h3 className="mt-2 text-xl font-black text-slate-950">
            {event.title}
          </h3>

          {event.clientName && (
            <p className="mt-1 text-sm font-semibold text-blue-700">
              Participant: {event.clientName}
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            isHighPriority
              ? "bg-rose-100 text-rose-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {isHighPriority ? "Important" : "Regular"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase text-slate-400">Date</p>
          <p className="mt-1 font-bold text-slate-800">🗓 {event.date}</p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase text-slate-400">Time</p>
          <p className="mt-1 font-bold text-slate-800">⏰ {event.time}</p>
        </div>
      </div>

      {event.notes && (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">
          {event.notes}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Status
        </p>

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
          {event.status || "scheduled"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onComplete(event.id)}
          disabled={isActionLoading}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Complete
        </button>

        <button
          type="button"
          onClick={() => onCancel(event.id)}
          disabled={isActionLoading}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => onDelete(event.id)}
          disabled={isActionLoading}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </article>
  );
}