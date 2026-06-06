"use client";

import Link from "next/link";

import NotificationBell from "@/components/Events/NotificationBell";

import { usePathname, useRouter } from "next/navigation";

import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { useEffect, useState } from "react";

import { getVisibleLinks, navigationLinks } from "@/config/accessControl";
import { useNavigation } from "@/components/NavigationProvider/NavigationContext"; // Make sure this path matches where you saved it

import { auth, db } from "@/firebase/firebase";

const emailVerificationToast =

  "יש לאמת את כתובת האימייל שלך כדי לגשת לדפי האתר.";

export default function Navbar() {

  const router = useRouter();

  const pathname = usePathname();

  // Consume dynamic navigation links and loading states from our global Firestore context
  const { links, isLoadingLinks } = useNavigation();

  // Tracks the current Firebase session so the navbar can show auth-aware links.

  const [currentUser, setCurrentUser] = useState(null);

  const [accountProfile, setAccountProfile] = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [verificationToast, setVerificationToast] = useState("");

  const [verificationBannerMessage, setVerificationBannerMessage] = useState("");

  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const [verificationCooldownSeconds, setVerificationCooldownSeconds] =

    useState(0);

  // Tracks logout UI state and displays a recoverable error if sign out fails.

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {

    // Firebase restores persisted sessions asynchronously, so the navbar listens

    // for auth changes instead of reading auth.currentUser once on render.

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      setCurrentUser(user);

      setAccountProfile(null);

    });

    return unsubscribe;

  }, []);

  useEffect(() => {

    if (!currentUser) {

      return;

    }

    let shouldIgnore = false;

    const fetchAccountProfile = async () => {

      try {

        const accountRef = doc(db, "accounts", currentUser.uid);

        const accountSnapshot = await getDoc(accountRef);

        if (shouldIgnore) {

          return;

        }

        if (accountSnapshot.exists()) {

          setAccountProfile(accountSnapshot.data());

        } else {

          setAccountProfile({

            email: currentUser.email || "",

            role: "User",

          });

        }

      } catch (error) {

        if (!shouldIgnore) {

          setLogoutError(

            error.message || "Failed to load account profile. Please refresh.",

          );

          setAccountProfile({

            email: currentUser.email || "",

            role: "User",

          });

        }

      }

    };

    fetchAccountProfile();

    return () => {

      shouldIgnore = true;

    };

  }, [currentUser]);

  useEffect(() => {

    if (!verificationToast) {

      return;

    }

    const timeoutId = window.setTimeout(() => {

      setVerificationToast("");

    }, 4000);

    return () => window.clearTimeout(timeoutId);

  }, [verificationToast]);

  useEffect(() => {

    if (verificationCooldownSeconds <= 0) {

      return;

    }

    const timeoutId = window.setTimeout(() => {

      setVerificationCooldownSeconds((currentSeconds) =>

        Math.max(currentSeconds - 1, 0),

      );

    }, 1000);

    return () => window.clearTimeout(timeoutId);

  }, [verificationCooldownSeconds]);

  const handleLogout = async () => {

    setLogoutError("");

    setIsMobileMenuOpen(false);

    try {

      setIsLoggingOut(true);

      await signOut(auth);

      // Replace history so the user cannot return to a protected page with Back.

      router.replace("/");

    } catch (error) {

      setLogoutError(error.message || "Failed to log out. Please try again.");

    } finally {

      setIsLoggingOut(false);

    }

  };

  const isActivePath = (href) => pathname === href;

  const userRole = accountProfile?.role || "";

  const profileEmail = accountProfile?.email || currentUser?.email || "Signed in";

  const isEmailUnverified = Boolean(

    currentUser?.email && currentUser.emailVerified === false,

  );

  //const visibleLinks = getVisibleLinks(navigationLinks, currentUser, userRole);
  // Fallback to the local hardcoded config list if Firestore is loading or returns empty to guarantee UI availability
  const currentNavigationSource = (isLoadingLinks || !links || links.length === 0) ? navigationLinks : links;
  const visibleLinks = getVisibleLinks(currentNavigationSource, currentUser, userRole);

  const getLinkClassName = (href) =>

    `rounded-md px-3 py-2 text-sm font-semibold transition ${

      isActivePath(href)

        ? "bg-blue-50 text-blue-700"

        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"

    }`;

  const handleRestrictedLinkClick = (event, link) => {

    if (isEmailUnverified && link.visibility === "authenticated") {

      event.preventDefault();

      setIsMobileMenuOpen(false);

      setVerificationToast(emailVerificationToast);

      setVerificationBannerMessage("");

      return;

    }

    setIsMobileMenuOpen(false);

  };

  const handleResendVerification = async () => {

    setVerificationBannerMessage("");

    setVerificationToast("");

    if (!currentUser || verificationCooldownSeconds > 0) {

      return;

    }

    try {

      setIsSendingVerification(true);

      setVerificationCooldownSeconds(60);

      await sendEmailVerification(currentUser);

      setVerificationBannerMessage("Verification email sent. Please check your inbox.");

    } catch (error) {

      setVerificationBannerMessage(

        error.message || "Failed to send verification email. Please try again.",

      );

    } finally {

      setIsSendingVerification(false);

    }

  };

  const renderNavLinks = () =>

    visibleLinks.map((link) => (
<Link

        className={getLinkClassName(link.href)}

        href={link.href}

        key={link.href}

        onClick={(event) => handleRestrictedLinkClick(event, link)}
>

        {link.label}
</Link>

    ));

  /* Internal comments in code are always in English */

  return (
<header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">

      {/* 1. Global Email Verification Warning Banner */}

      {isEmailUnverified && (
<div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
<div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
<div>
<p>

                Your email address is not verified. You cannot navigate or access

                app features until you verify your email.
</p>

              {verificationBannerMessage && (
<p className="mt-1 text-xs text-amber-800">

                  {verificationBannerMessage}
</p>

              )}
</div>
<button

              className="w-fit rounded-md bg-amber-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"

              type="button"

              onClick={handleResendVerification}

              disabled={isSendingVerification || verificationCooldownSeconds > 0}
>

              {isSendingVerification

                ? "Sending..."

                : verificationCooldownSeconds > 0

                  ? `שלח שוב (${verificationCooldownSeconds}s)`

                  : "שלח שוב"}
</button>
</div>
</div>

      )}
 
      {/* 2. Floating Verification Error Toast */}

      {verificationToast && (
<div

          className="fixed left-1/2 top-24 z-[70] w-[min(92vw,460px)] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-bold text-amber-900 shadow-lg"

          role="alert"
>

          {verificationToast}
</div>

      )}
 
      {/* 3. Main Consolidated Navigation Bar */}
<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">

        {/* Her updated Brand Logo and routing */}
<Link

          className="text-lg font-bold text-slate-950"

          href={currentUser ? "/home" : "/"}
>

          Kehila Programs
</Link>

        {/* Mobile Hamburger Button */}
<button

          aria-expanded={isMobileMenuOpen}

          aria-label="Toggle navigation menu"

          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100 sm:hidden"

          type="button"

          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
>
<span className="flex flex-col gap-1.5">
<span className="block h-0.5 w-5 rounded bg-current"></span>
<span className="block h-0.5 w-5 rounded bg-current"></span>
<span className="block h-0.5 w-5 rounded bg-current"></span>
</span>
</button>
 
        {/* Desktop Navigation Control */}
<div className="hidden items-center gap-4 sm:flex">

          {/* Dynamic role-based navigation loops - renders all tabs from accessControl */}
<div className="flex items-center gap-2">

            {renderNavLinks()}
</div>
 
          {currentUser && (
<div className="flex items-center gap-3 border-l border-slate-200 pl-3">

              {/* Her integrated Notification Bell */}
<NotificationBell />
 
              {/* Your User Profile Tag */}
<div className="flex max-w-[240px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
<span className="truncate text-sm font-semibold text-slate-700">

                  {profileEmail}
</span>

                {userRole && (
<span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">

                    {userRole}
</span>

                )}
</div>
 
              {/* Standardized Single Logout Button */}
<button

                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"

                type="button"

                onClick={handleLogout}

                disabled={isLoggingOut}
>

                {isLoggingOut ? "Logging out..." : "Logout"}
</button>
</div>

          )}
</div>
</nav>
 
      {/* 4. Mobile Menu Navigation Dropdown */}

      {isMobileMenuOpen && (
<div className="mx-auto w-full max-w-6xl border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
<div className="flex flex-col gap-2">

            {renderNavLinks()}

            {currentUser && (
<div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2">
<div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
<div className="flex flex-col gap-0.5 min-w-0">
<span className="truncate text-sm font-semibold text-slate-700">

                      {profileEmail}
</span>

                    {userRole && (
<span className="text-xs font-bold uppercase tracking-wide text-slate-500">

                        {userRole}
</span>

                    )}
</div>

                  {/* Notification Bell inside Mobile layout */}
<NotificationBell />
</div>
<button

                  className="rounded-md bg-red-600 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"

                  type="button"

                  onClick={handleLogout}

                  disabled={isLoggingOut}
>

                  {isLoggingOut ? "Logging out..." : "Logout"}
</button>
</div>

            )}
</div>
</div>

      )}
 
      {/* 5. Error Message Handling */}

      {logoutError && (
<p className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">

          {logoutError}
</p>

      )}
</header>

  );

}
 