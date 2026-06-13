import Link from "next/link";

const adminSections = [
  {
    href: "/admin/accounts",
    title: "Account Management",
    description: "Review user accounts, update roles, and remove accounts.",
  },
  {
    href: "/admin/permissions",
    title: "Navigation Permissions",
    description: "Control which roles can see each dynamic navigation link.",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Central Admin Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Manage user accounts and application navigation access.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {adminSections.map((section) => (
            <Link
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
              href={section.href}
              key={section.href}
            >
              <h2 className="text-xl font-bold text-slate-950 group-hover:text-blue-700">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {section.description}
              </p>
              <span className="mt-6 inline-flex text-sm font-bold text-blue-700">
                Open section &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
