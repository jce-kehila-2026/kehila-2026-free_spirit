"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";

import { auth } from "@/firebase/firebase";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRequestErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many reset requests were made. Please wait and try again.";
    case "auth/network-request-failed":
      return "We could not connect to the reset service. Check your connection and try again.";
    default:
      return "We could not send the reset link. Please try again.";
  }
}

/**
 * Requests a Firebase password reset email without revealing whether the
 * submitted address belongs to an account.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    setEmailError("");
    setRequestError("");

    if (!normalizedEmail) {
      setEmailError("Email address is required.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Build the continue URL from the active environment without hardcoding
      // a development or production hostname.
      const resetUrl = `${window.location.origin}/reset-password`;

      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: resetUrl,
        handleCodeInApp: true,
      });
      setIsSubmitted(true);
    } catch (error) {
      // Treat an unknown account exactly like a successful request to prevent
      // email-address enumeration when project-level protection is disabled.
      if (error?.code === "auth/user-not-found") {
        setIsSubmitted(true);
      } else {
        setRequestError(getRequestErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(205,224,201,0.82),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(185,217,210,0.62),transparent_34%),linear-gradient(135deg,#F7FAF5_0%,#EEF5F7_100%)] px-6 py-8">
        <section className="w-full max-w-[420px] rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-8 text-center shadow-[0_24px_60px_rgba(36,92,102,0.14)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBEF] text-[#2C6975]">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16v12H4V6Zm0 1 8 6 8-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-[#15383E]">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5C7478]" role="status">
            If an account exists for this email, a password reset link has been
            sent.
          </p>
          <Link
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#245C66] px-4 py-3 text-base font-bold text-white transition hover:bg-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-2"
            href="/login"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(205,224,201,0.82),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(185,217,210,0.62),transparent_34%),linear-gradient(135deg,#F7FAF5_0%,#EEF5F7_100%)] px-6 py-8">
      <form
        className="w-full max-w-[420px] rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-8 shadow-[0_24px_60px_rgba(36,92,102,0.14)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em] text-[#15383E]">
            Reset your password
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5C7478]">
            Enter your email address and we will send you a secure reset link.
          </p>
        </div>

        <div className="mb-[18px]">
          <label
            className="mb-2 block text-sm font-semibold text-[#31585F]"
            htmlFor="reset-email"
          >
            Email address
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-[#D7E3D5] bg-white px-3.5 py-3 text-[15px] text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:shadow-[0_0_0_4px_rgba(107,178,160,0.18)]"
            id="reset-email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {emailError && (
            <p className="mt-1.5 text-[13px] text-red-600" role="alert">
              {emailError}
            </p>
          )}
        </div>

        {requestError && (
          <p
            className="mb-4 text-center text-sm font-semibold text-red-700"
            role="alert"
          >
            {requestError}
          </p>
        )}

        <button
          className="mt-2 w-full rounded-full bg-[#245C66] px-4 py-3 text-base font-bold text-white transition hover:-translate-y-px hover:bg-[#173A40] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending reset link..." : "Send reset link"}
        </button>

        <p className="mt-5 text-center text-sm font-medium text-slate-600">
          <Link
            className="font-bold text-[#2C6975] hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-2"
            href="/login"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
