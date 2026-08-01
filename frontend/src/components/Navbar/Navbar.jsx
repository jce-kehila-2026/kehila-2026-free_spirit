"use client";

import Image from "next/image";
import Link from "next/link";
import { IconLogOut, IconMenu, IconUserRound, IconXMark } from "@/components/ui/Icons";

import NotificationBell from "@/components/Events/NotificationBell";
import freeSpiritLogo from "../../../docs/design-reference/image.png";

import { usePathname, useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { useEffect, useState } from "react";

import { getVisibleLinks, navigationLinks } from "@/config/accessControl";
import { isAdminRole, isClientRole } from "@/firebase/authRoleService";

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

            role: "",

          });

        }

      } catch (error) {

        if (!shouldIgnore) {

          setLogoutError(

            error.message || "Failed to load account profile. Please refresh.",

          );

          setAccountProfile({

            email: currentUser.email || "",

            role: "",

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

      router.replace("/login");

    } catch (error) {

      setLogoutError(error.message || "Failed to log out. Please try again.");

    } finally {

      setIsLoggingOut(false);

    }

  };

  const isActivePath = (href) => pathname === href;

  const userRole = accountProfile?.role || "";
  const canReadManagerNotifications = isAdminRole(userRole);
  const isClientUser = isClientRole(userRole);

  const profileEmail = accountProfile?.email || currentUser?.email || "Signed in";

  // Navigation is now intentionally static. Canonical lowercase roles are
  // resolved from accounts/{uid}; Firestore no longer drives navbar layout.
  const visibleLinks = getVisibleLinks(
    navigationLinks,
    currentUser,
    userRole,
  );
  
  const getLinkClassName = (href) =>

    `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${

      isActivePath(href)

        ? "bg-[#D8E9D5] text-[#1F5C65] shadow-[inset_0_0_0_1px_rgba(44,105,117,0.08)]"

        : "text-[#405D62] hover:bg-[#EEF4EC] hover:text-[#1F5C65]"

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

  /* Internal comments in code are always in English */

  return (
<header className="sticky top-0 z-50 border-b border-[#D7E3D5] bg-[#FFFDF8]/95 shadow-[0_4px_18px_rgba(44,105,117,0.06)] backdrop-blur">
<nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6">

        {/* Her updated Brand Logo and routing */}
<Link

          aria-label="Free Spirit home"
          className="group flex shrink-0 items-center gap-3"

          href="/"
>

          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-[#D7E3D5] transition group-hover:ring-[#6BB2A0]">
            <Image
              src={freeSpiritLogo}
              alt=""
              className="h-auto w-full object-contain"
              priority
              sizes="44px"
            />
          </span>
          <span className="hidden sm:block">
            <span className="block text-base font-bold leading-tight text-[#173A40]">
              Free Spirit
            </span>
          </span>
</Link>

        {/* Mobile Hamburger Button */}
<button

          aria-expanded={isMobileMenuOpen}

          aria-label="Toggle navigation menu"

          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C9D9D1] text-[#2C6975] transition hover:bg-[#E8F0E5] sm:hidden"

          type="button"

          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
>
          {isMobileMenuOpen ? (
            <IconXMark aria-hidden="true" className="h-5 w-5" />
          ) : (
            <IconMenu aria-hidden="true" className="h-5 w-5" />
          )}
</button>
 
        {/* Desktop Navigation Control */}
<div className="hidden min-w-0 items-center gap-3 sm:flex">

          {/* Static role-based navigation loops - renders all tabs from accessControl */}
<div className="flex items-center gap-1">

            {renderNavLinks()}
</div>
 
          {currentUser && (
<div className="flex items-center gap-2 border-l border-[#D7E3D5] pl-3">

              {/* Staff-only: clients cannot read manager notification collections. */}
              {canReadManagerNotifications && <NotificationBell />}

              {isClientUser && (
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-full bg-[#245C66] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#173A40]"
                >
                  Continue your Onboarding
                </Link>
              )}
 
              {/* Your User Profile Tag */}
<div className="flex max-w-[235px] items-center gap-2.5 rounded-full bg-[#EEF4EC] py-1.5 pl-1.5 pr-3 ring-1 ring-[#D7E3D5]">
<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C6975] text-white">
  <IconUserRound aria-hidden="true" className="h-4 w-4" />
</span>
<span className="min-w-0">
<span className="block truncate text-xs font-bold text-[#244B52]">

                  {profileEmail}
</span>

                {userRole && (
<span className="block truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A8589]">

                    {userRole}
</span>

                )}
</span>
</div>
 
              {/* Standardized Single Logout Button */}
<button

                className="inline-flex items-center gap-2 rounded-full border border-[#BFD0CA] bg-white px-3.5 py-2 text-sm font-bold text-[#2C6975] transition hover:border-[#2C6975] hover:bg-[#F3F7F1] disabled:cursor-not-allowed disabled:opacity-70"

                type="button"

                onClick={handleLogout}

                disabled={isLoggingOut}
>

                <IconLogOut aria-hidden="true" className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Log out"}
</button>
</div>

          )}
</div>
</nav>
 
      {/* 4. Mobile Menu Navigation Dropdown */}

      {isMobileMenuOpen && (
<div className="mx-auto w-full max-w-7xl border-t border-[#D7E3D5] bg-[#FFFDF8] px-4 py-4 sm:hidden">
<div className="flex flex-col gap-1.5">

            {renderNavLinks()}

            {currentUser && (
<div className="mt-2 flex flex-col gap-3 border-t border-[#D7E3D5] pt-4">
<div className="flex items-center justify-between rounded-2xl border border-[#D7E3D5] bg-[#EEF4EC] px-3 py-2.5">
<div className="flex flex-col gap-0.5 min-w-0">
<span className="truncate text-sm font-semibold text-[#244B52]">

                      {profileEmail}
</span>

                    {userRole && (
<span className="text-xs font-bold uppercase tracking-wide text-[#6A8589]">

                        {userRole}
</span>

                    )}
</div>

                  {/* Staff-only: clients cannot read manager notification collections. */}
                  {canReadManagerNotifications && <NotificationBell />}
</div>
                {isClientUser && (
<Link
                    href="/onboarding"
                    className="inline-flex items-center justify-center rounded-full bg-[#245C66] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#173A40]"
                    onClick={() => setIsMobileMenuOpen(false)}
>
                    Continue your Onboarding
</Link>
                )}
<button

                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2C6975] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#245A64] disabled:cursor-not-allowed disabled:opacity-70"

                  type="button"

                  onClick={handleLogout}

                  disabled={isLoggingOut}
>

                  <IconLogOut aria-hidden="true" className="h-4 w-4" />
                  {isLoggingOut ? "Logging out..." : "Log out"}
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
