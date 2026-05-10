"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/firebase/firebase";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Tracks the current Firebase session so the navbar can show auth-aware links.
  const [currentUser, setCurrentUser] = useState(null);

  // Tracks logout UI state and displays a recoverable error if sign out fails.
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    // Firebase restores persisted sessions asynchronously, so the navbar listens
    // for auth changes instead of reading auth.currentUser once on render.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    setLogoutError("");

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          className="text-lg font-bold text-slate-950"
          href={currentUser ? "/manage-programs" : "/"}
        >
          Kehila Programs
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Authenticated users get protected navigation and a logout action. */}
          {currentUser ? (
            <>
              <Link
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActivePath("/manage-programs")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href="/manage-programs"
              >
                Manage Programs
              </Link>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            /* Guests only see public auth routes. */
            <>
              <Link
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActivePath("/")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href="/"
              >
                Login
              </Link>
              <Link
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActivePath("/signup")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href="/signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
      {logoutError && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">
          {logoutError}
        </p>
      )}
    </header>
  );
}
