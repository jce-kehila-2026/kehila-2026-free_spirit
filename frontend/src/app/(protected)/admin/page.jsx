import Link from "next/link";

const adminSections = [
  // Dynamic navigation permissions were removed; static RBAC keeps this dashboard focused on account operations.
  {
    href: "/admin/accounts",
    title: "Account Management",
    description: "Review user accounts, update roles, and remove accounts.",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-6 overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] px-6 py-8 text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)] sm:px-9 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CDE0C9]">
            Administration
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Central admin dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Manage user accounts and role assignments.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {adminSections.map((section) => (
            <Link
              className="group flex min-h-56 flex-col rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-7 shadow-[0_14px_34px_rgba(44,105,117,0.08)] transition hover:-translate-y-0.5 hover:border-[#B9CFCA] hover:shadow-[0_18px_40px_rgba(44,105,117,0.12)] focus:outline-none focus:ring-4 focus:ring-[#B9D4CC]"
              href={section.href}
              key={section.href}
            >
              <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E] group-hover:text-[#245C66]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5C7478]">
                {section.description}
              </p>
              <span className="mt-auto inline-flex pt-8 text-sm font-bold text-[#2C6975]">
                Open section &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
