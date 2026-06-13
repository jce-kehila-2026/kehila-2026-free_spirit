const onboardingSections = [
  {
    title: "Personal Details",
    description:
      "Review the contact and identification details needed for your onboarding.",
    emptyState: "Your personal details summary is not connected yet.",
    accentClassName: "bg-blue-500",
  },
  {
    title: "Required Documents",
    description:
      "See which documents have been received and which items still need attention.",
    emptyState: "Your document checklist is not connected yet.",
    accentClassName: "bg-amber-500",
  },
  {
    title: "Meetings & Reminders",
    description:
      "Keep track of upcoming conversations, appointments, and important reminders.",
    emptyState: "Your meetings and reminders are not connected yet.",
    accentClassName: "bg-violet-500",
  },
  {
    title: "Assigned Program",
    description:
      "Find the program information and participation details relevant to you.",
    emptyState: "Your assigned program is not connected yet.",
    accentClassName: "bg-emerald-500",
  },
  {
    title: "Message Board",
    description:
      "Receive onboarding updates and guidance from the program team in one place.",
    emptyState: "Your message board is not connected yet.",
    accentClassName: "bg-rose-500",
  },
  {
    title: "Timeline",
    description:
      "Follow your onboarding milestones and understand what comes next.",
    emptyState: "Your onboarding timeline is not connected yet.",
    accentClassName: "bg-cyan-500",
  },
] as const;

interface OnboardingSectionCardProps {
  step: number;
  title: string;
  description: string;
  emptyState: string;
  accentClassName: string;
}

/**
 * Presents one future onboarding area without implying that participant data
 * is already available or calculating progress from placeholder values.
 */
function OnboardingSectionCard({
  step,
  title,
  description,
  emptyState,
  accentClassName,
}: OnboardingSectionCardProps) {
  return (
    <article className="flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${accentClassName}`}
            aria-label={`Step ${step}`}
          >
            {step}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            Integration pending
          </span>
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-auto pt-6">
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-5 text-slate-500">
            {emptyState}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Participant-facing onboarding home screen.
 * Live participant, document, program, meeting, message, and timeline data
 * remain intentionally disconnected until their secure contracts are ready.
 */
export default function ClientDashboardShell() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Your onboarding journey
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Client Onboarding Dashboard
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Follow your progress, see what still needs attention, and understand
            the next steps in your onboarding journey.
          </p>
        </header>

        <section
          className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6"
          aria-labelledby="onboarding-progress-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                className="text-lg font-bold text-slate-950"
                id="onboarding-progress-title"
              >
                Your progress overview
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Section updates will appear here as onboarding integrations
                become available.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
              Setup in progress
            </span>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="onboarding-sections-title">
          <div className="mb-4">
            <h2
              className="text-xl font-bold text-slate-950"
              id="onboarding-sections-title"
            >
              Onboarding sections
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These areas will guide you from your first details through final
              onboarding milestones.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingSections.map((section, index) => (
              <OnboardingSectionCard
                accentClassName={section.accentClassName}
                description={section.description}
                emptyState={section.emptyState}
                key={section.title}
                step={index + 1}
                title={section.title}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
