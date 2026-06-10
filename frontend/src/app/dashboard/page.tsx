"use client";

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import ClientDashboardShell from "@/components/dashboard/ClientDashboardShell";
import ManagerDashboardShell from "@/components/dashboard/ManagerDashboardShell";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import { auth, db } from "@/firebase/firebase";

type AccountRole = "Admin" | "Program Manager" | "User" | "Client";
type DashboardKind = "manager" | "client";

const managerRoles: ReadonlySet<AccountRole> = new Set([
  "Admin",
  "Program Manager",
]);
const clientRoles: ReadonlySet<AccountRole> = new Set(["User", "Client"]);

function isAccountRole(value: unknown): value is AccountRole {
  return (
    typeof value === "string" &&
    (managerRoles.has(value as AccountRole) ||
      clientRoles.has(value as AccountRole))
  );
}

function DashboardLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <p className="text-sm font-semibold text-slate-600" role="status">
        Loading your personal area...
      </p>
    </main>
  );
}

function DashboardRoleResolver() {
  const [dashboardKind, setDashboardKind] = useState<DashboardKind | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    // Resolve the role from the canonical account profile after Firebase restores
    // the active browser session. ProtectedRoute independently enforces access.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return;
      }

      try {
        const accountSnapshot = await getDoc(doc(db, "accounts", user.uid));
        const role = accountSnapshot.exists()
          ? accountSnapshot.data().role
          : "User";

        if (!isAccountRole(role)) {
          throw new Error("Unsupported account role.");
        }

        if (!shouldIgnore) {
          setDashboardKind(managerRoles.has(role) ? "manager" : "client");
          setErrorMessage("");
        }
      } catch {
        // Fail closed when the profile cannot be read or contains an unknown role.
        if (!shouldIgnore) {
          setDashboardKind(null);
          setErrorMessage(
            "We could not load your personal area. Please refresh and try again.",
          );
        }
      }
    });

    return () => {
      shouldIgnore = true;
      unsubscribe();
    };
  }, []);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-red-700" role="alert">
          {errorMessage}
        </p>
      </main>
    );
  }

  if (!dashboardKind) {
    return <DashboardLoadingState />;
  }

  return dashboardKind === "manager" ? (
    <ManagerDashboardShell />
  ) : (
    <ClientDashboardShell />
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      {/* Keep client session and profile resolution behind a build-safe boundary. */}
      <Suspense fallback={<DashboardLoadingState />}>
        <DashboardRoleResolver />
      </Suspense>
    </ProtectedRoute>
  );
}
