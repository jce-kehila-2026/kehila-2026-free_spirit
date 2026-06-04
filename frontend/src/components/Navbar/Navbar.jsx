"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getVisibleLinks, navigationLinks } from "@/config/accessControl";
import { auth, db } from "@/firebase/firebase";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Tracks the current Firebase session so the navbar can show auth-aware links.
  const [currentUser, setCurrentUser] = useState(null);
  const [accountProfile, setAccountProfile] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const visibleLinks = getVisibleLinks(navigationLinks, currentUser, userRole);

  const getLinkClassName = (href) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition ${
      isActivePath(href)
        ? "bg-blue-50 text-blue-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
    }`;

  const renderNavLinks = () =>
    visibleLinks.map((link) => (
      <Link
        className={getLinkClassName(link.href)}
        href={link.href}
        key={link.href}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {link.label}
      </Link>
    ));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="text-lg font-bold text-slate-950"
            href={currentUser ? "/manage-programs" : "/"}
          >
            Free Spirit Experience
          </Link>

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

          <div className="hidden items-center gap-2 sm:flex">
            {renderNavLinks()}
            {currentUser && (
              <>
                <div className="ml-2 flex max-w-[240px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {profileEmail}
                  </span>
                  {userRole && (
                    <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {userRole}
                    </span>
                  )}
                </div>
                <button
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            )}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:hidden">
            {renderNavLinks()}
            {currentUser && (
              <>
                <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {profileEmail}
                  </span>
                  {userRole && (
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {userRole}
                    </span>
                  )}
                </div>
                <button
                  className="rounded-md bg-red-600 px-4 py-2 text-left text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            )}
          </div>
        )}
      </nav>
      {logoutError && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">
          {logoutError}
        </p>
      )}
    </header>
  );
}
