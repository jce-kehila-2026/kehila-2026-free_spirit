"use client";

import { useCallback, useEffect, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { IconArrowLeft, IconGoogleLogo } from "@/components/ui/Icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase/firebase";
import {
  claimClientInviteForUser,
  CLIENT_EMAIL_VERIFICATION_PATH,
  getInviteTokenFromCurrentUrl,
  getPostLoginRedirect,
  ACCESS_DENIED_PATH,
} from "@/firebase/authRoleService";
import styles from "./Login.module.css";

async function getSecurePostAuthRedirect(user) {
  const inviteToken = getInviteTokenFromCurrentUrl();

  if (inviteToken) {
    try {
      // Existing users may open a client invite from the login page; claim it
      // before route selection so Firestore rules can authorize /onboarding.
      await claimClientInviteForUser(user, inviteToken);
    } catch (error) {
      const fallbackRedirect = await getPostLoginRedirect(user);

      if (fallbackRedirect !== "/home") {
        return fallbackRedirect;
      }

      throw error;
    }

    return getPostLoginRedirect(user);
  }

  return getPostLoginRedirect(user);
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

  const routeAfterAuth = useCallback(async (user) => {
    const redirectPath = await getSecurePostAuthRedirect(user);

    if (redirectPath === ACCESS_DENIED_PATH) {
      // Inactive client accounts must not keep a Firebase Auth session alive.
      await signOut(auth);
      router.replace(ACCESS_DENIED_PATH);
      return;
    }

    router.replace(redirectPath);
  }, [router]);

  useEffect(() => {
    // If Firebase restores an existing session, skip login unless showing a denial.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !wasAccessDenied) {
        await user.reload();
        const refreshedUser = auth.currentUser || user;
        const redirectPath = await getSecurePostAuthRedirect(refreshedUser);

        if (redirectPath === "/login") {
          setAuthError(
            "Your account is not authorized. Please contact an administrator.",
          );
          setIsCheckingAuth(false);
          return;
        }

        if (redirectPath === CLIENT_EMAIL_VERIFICATION_PATH) {
          setAuthError(
            "Please verify your email address before continuing to onboarding.",
          );
          setIsCheckingAuth(false);
          return;
        }

        await routeAfterAuth(refreshedUser);
        return;
      }

      setIsCheckingAuth(false);
    });

    return unsubscribe;
  }, [routeAfterAuth, wasAccessDenied]);

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

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );
      await routeAfterAuth(userCredential.user);
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

      await routeAfterAuth(result.user);
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
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[#E8C1BA] bg-[#FFF2EF] px-5 py-4 text-center text-sm font-bold text-[#A3483C] shadow-lg"
          role="alert"
        >
          You do not have permission to access that page.
        </div>
      )}

      {wasEmailNotVerified && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-[#E5C97D] bg-[#FFF8E8] px-5 py-4 text-center text-sm font-bold text-[#8A6822] shadow-lg"
          role="alert"
        >
          Please verify your email address before continuing to onboarding.
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Link
          aria-label="Back to home"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#2C6975] transition hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-2"
          href="/"
        >
          {/* The public root is the safe exit from the standalone login flow. */}
          <IconArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

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
          className="mb-5 inline-block text-sm font-bold text-[#2C6975] transition hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-2"
          href="/forgot-password"
        >
          Forgot password?
        </Link>

        {/* Remember Me checkbox */}
        <label
          className="mb-5 flex items-center gap-2 text-sm font-medium text-[#31585F]"
          htmlFor="rememberMe"
        >
          <input
            className="h-4 w-4 rounded border-[#B9CFCA] text-[#245C66] accent-[#245C66] focus:ring-[#6BB2A0]"
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
          <IconGoogleLogo />
          <span>Sign in with Google</span>
        </button>
      </form>
    </main>
  );
}
