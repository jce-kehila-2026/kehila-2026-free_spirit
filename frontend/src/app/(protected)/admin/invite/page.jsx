"use client";

import { useState } from "react";
import Link from "next/link";
import { queueAdminStaffInviteEmail } from "@/application/StaffManagementService";

export default function AdminStaffInvitePage() {
  const [emailAddress, setEmailAddress] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");
    setError("");

    try {
      setIsSubmitting(true);
      await queueAdminStaffInviteEmail(emailAddress, window.location.origin);
      setEmailAddress("");
      setFeedback("Invitation email queued successfully.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to queue the staff invitation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href="/admin"
          className="mb-4 inline-flex text-sm font-bold text-[#2C6975] hover:text-[#173A40]"
        >
          Back to admin dashboard
        </Link>

        <div className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] sm:p-8">
          <header>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#15383E]">
              Staff Management
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#5C7478]">
              Invite a new administrator with a role-bound signup link.
            </p>
          </header>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2" htmlFor="staff-email">
              <span className="text-sm font-semibold text-[#31585F]">
                Staff email address
              </span>
              <input
                id="staff-email"
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-[#D7E3D5] bg-white px-4 py-3 text-sm text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:shadow-[0_0_0_4px_rgba(107,178,160,0.18)]"
                required
              />
            </label>

            {feedback && (
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {feedback}
              </p>
            )}

            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-fit rounded-full bg-[#245C66] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173A40] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Sending..." : "Send Invitation Link"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
