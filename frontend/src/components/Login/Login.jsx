"use client";

import { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase/firebase";
import styles from "./Login.module.css";

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

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasAccessDenied = searchParams.get("accessDenied") === "1";
  const wasEmailNotVerified = searchParams.get("emailNotVerified") === "1";

  // Holds the current email and password values.
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  // Holds validation messages for the form fields.
  const [errors, setErrors] = useState({});

  // Holds Firebase authentication error messages.
  const [authError, setAuthError] = useState("");

  // Holds the loading state while Firebase processes the login request.
  const [isLoading, setIsLoading] = useState(false);

  // Holds the loading state while Firebase restores a persisted session.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Holds the user's preferred session persistence option.
  const [rememberMe, setRememberMe] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(wasAccessDenied);

  useEffect(() => {
    // If Firebase restores an existing session, skip login unless showing a denial.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !wasAccessDenied && !wasEmailNotVerified) {
        router.replace("/home");
        return;
      }

      setIsCheckingAuth(false);
    });

    return unsubscribe;
  }, [router, wasAccessDenied, wasEmailNotVerified]);

  useEffect(() => {
    if (!showAccessDenied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAccessDenied(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [showAccessDenied]);

  // Converts Firebase error codes into user-friendly messages.
  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "User not found.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was closed before completion.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      default:
        return error.message || "Login failed. Please try again.";
    }
  };

  // Updates the matching field when the user types.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [name]: value,
    }));
  };

  // Updates the Remember Me checkbox state.
  const handleRememberMeChange = (event) => {
    setRememberMe(event.target.checked);
  };

  // Validates required fields before submitting the form.
  const validateForm = () => {
    const nextErrors = {};

    if (!credentials.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!credentials.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  // Handles the form submit action.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // Remember Me controls whether Firebase stores the session locally or per tab.
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );
      router.push("/home");
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Handles Google popup authentication.
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    /*
      Added for Events & Follow-ups subsystem:
      Required for future Google Calendar integration.
      This allows the system to create and manage calendar events
      for scheduled meetings and reminders.
    */
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

    setAuthError("");
    try {
      setIsLoading(true);

      // Google sign-in uses the same Firebase auth state as email/password login.
      const result = await signInWithPopup(auth, provider);

      /*
        Google Calendar integration preparation:
        Access token will later be used by the Events subsystem
        to sync meetings with Google Calendar.
      */
      const credential =
        GoogleAuthProvider.credentialFromResult(result);

      const accessToken = credential?.accessToken || null;

      // Temporary local storage until backend sync is implemented.
      if (accessToken) {
        localStorage.setItem("googleCalendarAccessToken", accessToken);
      }

      router.push("/home");
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.form}>
          <p className={styles.subtitle}>Checking your session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {showAccessDenied && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700 shadow-lg"
          role="alert"
        >
          אין לך הרשאה לגשת לדף זה
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.subtitle}>Welcome back. Please sign in.</p>
        </div>

        {/* Email input field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            className={styles.input}
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={credentials.email}
            onChange={handleChange}
          />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>

        {/* Password input field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            className={styles.input}
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={credentials.password}
            onChange={handleChange}
          />
          {errors.password && <p className={styles.error}>{errors.password}</p>}
        </div>

        <Link
          className="mb-5 inline-block text-sm font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          href="/forgot-password"
        >
          Forgot password?
        </Link>

        {/* Remember Me checkbox */}
        <label
          className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-700"
          htmlFor="rememberMe"
        >
          <input
            className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={handleRememberMeChange}
          />
          Remember Me
        </label>

        {authError && <p className={styles.authError}>{authError}</p>}

        <button className={styles.button} type="submit" disabled={isLoading}>
          {isLoading ? "Signing In..." : "Sign In"}
        </button>

        {/* Public route for users who still need to create an account. */}
        <p className="mt-5 text-center text-sm font-medium text-slate-600">
          Don&apos;t have an account?{" "}
          <Link className="font-bold text-blue-600 hover:text-blue-700" href="/signup">
            Sign Up
          </Link>
        </p>

        {/* Separates email login from Google login. */}
        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>OR</span>
          <span className={styles.dividerLine}></span>
        </div>

        <button
          className={styles.googleButton}
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <GoogleLogo />
          <span>Sign in with Google</span>
        </button>
      </form>
    </main>
  );
}
