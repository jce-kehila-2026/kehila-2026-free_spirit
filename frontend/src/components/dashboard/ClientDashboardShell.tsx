/**
 * Placeholder for the participant-facing onboarding workspace.
 * Future iterations will add personal details, documents, and timeline status.
 */
export default function ClientDashboardShell() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">
          Client Onboarding Dashboard
        </h1>
        <p className="mt-3 text-slate-600">
          Personal details, missing documents, and the onboarding timeline will
          be available here.
        </p>
      </section>
    </main>
  );
}
