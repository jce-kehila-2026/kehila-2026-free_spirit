import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm";
import EventList from "@/components/Events/EventList";
import EventNotifications from "@/components/Events/EventNotifications";

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_35%),linear-gradient(135deg,_#f8fafc,_#eef2ff)] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-9 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                Free Spirit Association
              </p>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Meetings & Follow-ups
              </h1>

              <p className="mt-4 max-w-2xl text-base text-slate-300">
                Schedule participant meetings, track reminders, and manage important follow-ups.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-sm text-slate-300">Today</p>
              <p className="text-2xl font-bold">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Scheduled Meetings
            </p>

            <p className="mt-3 text-4xl font-black text-slate-950">
              Live
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Loaded from the system
            </p>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Important Follow-ups
            </p>

            <p className="mt-3 text-4xl font-black text-rose-600">
              High
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Additional reminders enabled
            </p>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Reminder Tracking
            </p>

            <p className="mt-3 text-4xl font-black text-blue-600">
              Active
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Automatic follow-up support
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <ScheduleMeetingForm />
          <EventList />
        </section>

        <EventNotifications />
      </div>
    </main>
  );
}