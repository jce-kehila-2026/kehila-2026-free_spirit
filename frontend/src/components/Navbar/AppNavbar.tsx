"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const NAVBARLESS_PATHS = new Set(["/login", "/onboarding", "/signup"]);

/**
 * Keeps the existing global navigation behavior for current routes while
 * allowing intentionally standalone client-facing flows to opt out.
 */
export default function AppNavbar() {
  const pathname = usePathname();

  if (NAVBARLESS_PATHS.has(pathname)) {
    return null;
  }

  return <Navbar />;
}
