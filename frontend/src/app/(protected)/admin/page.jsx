import Link from "next/link";

const adminSections = [
  // Dynamic navigation permissions were removed; static RBAC keeps this dashboard focused on account operations.
  {
    href: "/admin/accounts",
    title: "Account Management",
    description: "Review user accounts, update roles, and remove accounts.",
  },
  {
    href: "/admin/invite",
    title: "Staff Management",
    description: "Invite new administrators and manage staff roles.",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#2C6975] px-5 py-4 text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)] sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="absolute -left-20 -top-24 h-72 w-72 rounded-full border-[48px] border-[#6BB2A0]/25"
          />
          <div className="relative min-w-0">
            <h1 className="max-w-3xl text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
              Central admin dashboard
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/78">
              Manage user accounts and role assignments.
            </p>
          </div>
        </header>

        <div className="grid max-w-4xl gap-5 md:grid-cols-2">
          {adminSections.map((section) => (
            <Link
              className="group flex min-h-36 flex-col rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)] transition hover:-translate-y-0.5 hover:border-[#B9CFCA] hover:shadow-[0_18px_40px_rgba(44,105,117,0.12)] focus:outline-none focus:ring-4 focus:ring-[#B9D4CC] sm:p-6"
              href={section.href}
              key={section.href}
            >
              <h2 className="text-xl font-bold tracking-[-0.02em] text-[#15383E] group-hover:text-[#245C66]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5C7478]">
                {section.description}
              </p>
              <span className="mt-5 inline-flex text-sm font-bold text-[#2C6975]">
                Open section &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
