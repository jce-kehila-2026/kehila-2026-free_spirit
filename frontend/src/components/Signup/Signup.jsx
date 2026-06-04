"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/firebase";

// Inline Google mark used by the OAuth button without adding another asset file.
function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Signup() {
  const router = useRouter();

  // Holds the controlled form values that are submitted to Firebase and Firestore.
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Separates field-level validation from Firebase/Firestore process errors.
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Converts Firebase and custom registration errors into user-facing messages.
  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      default:
        return error.message || "Signup failed. Please try again.";
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required";
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSignupError("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // First create the Firebase Auth user, then persist app-specific profile data.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      try {
        await sendEmailVerification(auth.currentUser || userCredential.user);
      } catch (verificationError) {
        console.error("Failed to send verification email:", verificationError);
      }

      router.push("/manage-programs");
    } catch (error) {
      setSignupError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();

    setSignupError("");

    try {
      setIsLoading(true);

      await signInWithPopup(auth, provider);
      router.push("/manage-programs");
    } catch (error) {
      setSignupError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-8">
      <form
        className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold leading-tight text-slate-950">
            Sign Up
          </h1>
          <p className="mt-2 text-[15px] text-slate-500">
            Create an account to manage programs.
          </p>
        </div>

        <div className="mb-[18px]">
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-950 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)]"
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && (
            <p className="mt-1.5 text-[13px] text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="mb-[18px]">
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-950 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)]"
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && (
            <p className="mt-1.5 text-[13px] text-red-600">{errors.password}</p>
          )}
        </div>

        <div className="mb-[18px]">
          <label
            className="mb-2 block text-sm font-semibold text-slate-700"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-950 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)]"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-[13px] text-red-600">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {signupError && (
          <p className="mb-4 text-center text-sm font-semibold text-red-600">
            {signupError}
          </p>
        )}

        <button
          className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white transition hover:-translate-y-px hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200"></span>
          <span className="text-xs font-bold text-slate-500">OR</span>
          <span className="h-px flex-1 bg-slate-200"></span>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-3 text-[15px] font-bold text-slate-800 transition hover:-translate-y-px hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="button"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <GoogleLogo />
          <span>Sign up with Google</span>
        </button>

        <p className="mt-5 text-center text-sm font-medium text-slate-600">
          Already have an account?{" "}
          <Link className="font-bold text-blue-600 hover:text-blue-700" href="/">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
