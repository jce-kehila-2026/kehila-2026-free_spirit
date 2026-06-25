import Link from "next/link";
import { INACTIVE_CLIENT_ACCOUNT_MESSAGE } from "@/firebase/authRoleService";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#F7FAF5_0%,#EEF5F7_100%)] px-6 py-10 text-[#15383E]">
      <section className="w-full max-w-lg rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-7 text-center shadow-[0_18px_45px_rgba(36,92,102,0.14)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A3483C]">
          Access Denied
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.03em]">
          Account inactive
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5C7478]">
          {INACTIVE_CLIENT_ACCOUNT_MESSAGE}
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-[#245C66] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0]"
          href="/login"
        >
          Return to Login
        </Link>
      </section>
    </main>
  );
}
