"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/firebase/firebase";
import {
  getPasswordRequirementResults,
  isPasswordValid,
} from "@/utils/passwordValidation";

function RequirementStatusIcon({ isMet }) {
  return isMet ? (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 10 3 3 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function getResetErrorMessage(error) {
  switch (error?.code) {
    case "auth/expired-action-code":
      return "This password reset link has expired. Request a new link from the login page.";
    case "auth/invalid-action-code":
      return "This password reset link is invalid or has already been used.";
    case "auth/user-disabled":
      return "This account is disabled. Please contact support.";
    case "auth/user-not-found":
      return "The account for this password reset link could not be found.";
    case "auth/weak-password":
      return "Password must meet all requirements.";
    default:
      return "We could not reset your password. Please request a new link and try again.";
  }
}

/**
 * Verifies and completes Firebase password reset action links without storing
 * or logging the reset code or either password value.
 */
export default function ResetPassword() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [verificationState, setVerificationState] = useState("checking");
  const [accountEmail, setAccountEmail] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [resetError, setResetError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const passwordRequirementResults = getPasswordRequirementResults(
    formData.password,
  );

  useEffect(() => {
    let shouldIgnore = false;

    async function verifyResetLink() {
      if (mode !== "resetPassword" || !oobCode) {
        setVerificationState("error");
        setResetError(
          "This password reset link is incomplete or invalid. Request a new link from the login page.",
        );
        return;
      }

      try {
        // Firebase returns the account email only after the action code is valid.
        const email = await verifyPasswordResetCode(auth, oobCode);

        if (!shouldIgnore) {
          setAccountEmail(email);
          setVerificationState("ready");
          setResetError("");
        }
      } catch (error) {
        if (!shouldIgnore) {
          setVerificationState("error");
          setResetError(getResetErrorMessage(error));
        }
      }
    }

    verifyResetLink();

    return () => {
      shouldIgnore = true;
    };
  }, [mode, oobCode]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (!isPasswordValid(formData.password)) {
      nextErrors.password = "Password must meet all requirements.";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setResetError("");

    if (!oobCode || !validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmPasswordReset(auth, oobCode, formData.password);
      setFormData({ password: "", confirmPassword: "" });
      setVerificationState("success");
    } catch (error) {
      setResetError(getResetErrorMessage(error));

      if (
        error?.code === "auth/expired-action-code" ||
        error?.code === "auth/invalid-action-code"
      ) {
        setVerificationState("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (verificationState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-8">
        <section
          className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
          role="status"
        >
          <p className="text-sm font-semibold text-slate-600">
            Checking your password reset link...
          </p>
        </section>
      </main>
    );
  }

  if (verificationState === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-8">
        <section className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <RequirementStatusIcon isMet />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">
            Password reset complete
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600" role="status">
            Your password has been reset. You can now sign in.
          </p>
          <Link
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            href="/login"
          >
            Back to login
          </Link>
        </section>
      </main>
    );
  }

  if (verificationState === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-8">
        <section className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <h1 className="text-3xl font-bold text-slate-950">
            Reset link unavailable
          </h1>
          <p
            className="mt-3 text-sm font-semibold leading-6 text-red-700"
            role="alert"
          >
            {resetError}
          </p>
          <Link
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            href="/login"
          >
            Back to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-8">
      <form
        className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold leading-tight text-slate-950">
            Reset your password
          </h1>
          <p className="mt-2 text-[15px] text-slate-500">
            Enter a new password for your account.
          </p>
          {accountEmail && (
            <p className="mt-2 truncate text-xs font-semibold text-slate-500">
              {accountEmail}
            </p>
          )}
        </div>

        <div className="mb-[18px]">
          <label
            className="mb-2 block text-sm font-semibold text-slate-700"
            htmlFor="reset-password"
          >
            New Password
          </label>
          <div className="relative">
            <input
              aria-describedby="reset-password-requirements"
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-3.5 pr-20 text-[15px] text-slate-950 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)]"
              id="reset-password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Create a new password"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 my-auto h-fit rounded px-1.5 py-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              type="button"
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-[13px] text-red-600" role="alert">
              {errors.password}
            </p>
          )}
          <ul
            className="mt-3 grid gap-1.5 text-xs"
            id="reset-password-requirements"
            aria-label="Password requirements"
            aria-live="polite"
          >
            {passwordRequirementResults.map((requirement) => (
              <li
                className={`flex items-center gap-2 font-medium ${
                  requirement.isMet ? "text-emerald-700" : "text-slate-500"
                }`}
                key={requirement.id}
              >
                <RequirementStatusIcon isMet={requirement.isMet} />
                <span>{requirement.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-[18px]">
          <label
            className="mb-2 block text-sm font-semibold text-slate-700"
            htmlFor="reset-confirm-password"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-3.5 pr-20 text-[15px] text-slate-950 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)]"
              id="reset-confirm-password"
              name="confirmPassword"
              type={isConfirmPasswordVisible ? "text" : "password"}
              placeholder="Re-enter your new password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button
              aria-label={
                isConfirmPasswordVisible
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              className="absolute inset-y-0 right-3 my-auto h-fit rounded px-1.5 py-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              type="button"
              onClick={() =>
                setIsConfirmPasswordVisible((isVisible) => !isVisible)
              }
            >
              {isConfirmPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-[13px] text-red-600" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {resetError && (
          <p
            className="mb-4 text-center text-sm font-semibold text-red-700"
            role="alert"
          >
            {resetError}
          </p>
        )}

        <button
          className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white transition hover:-translate-y-px hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </button>

        <p className="mt-5 text-center text-sm font-medium text-slate-600">
          <Link
            className="font-bold text-blue-600 hover:text-blue-700"
            href="/login"
          >
            Back to login
          </Link>
        </p>
      </form>
    </main>
  );
}
