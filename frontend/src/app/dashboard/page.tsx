"use client";

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import ManagerDashboardShell from "@/components/dashboard/ManagerDashboardShell";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import { auth, db } from "@/firebase/firebase";
import { isAdminRole } from "@/firebase/authRoleService";

const dashboardLoadError =
  "We could not load your personal area. Please refresh and try again.";

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
  const [isAdminDashboardReady, setIsAdminDashboardReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState(() =>
    auth && db ? "" : dashboardLoadError,
  );

  useEffect(() => {
    let shouldIgnore = false;

    if (!auth || !db) {
      return;
    }
    const activeAuth = auth;
    const activeDb = db;

    // Resolve the role from the canonical account profile after Firebase restores
    // the active browser session. ProtectedRoute independently enforces access.
    const unsubscribe = onAuthStateChanged(activeAuth, async (user) => {
      if (!user) {
        return;
      }

      try {
        const accountSnapshot = await getDoc(doc(activeDb, "accounts", user.uid));
        const role = accountSnapshot.exists() ? accountSnapshot.data().role : "";

        if (!isAdminRole(role)) {
          throw new Error("Unsupported account role.");
        }

        if (!shouldIgnore) {
          // This page is inside the protected manager route group; clients are
          // routed to /onboarding before this resolver can render.
          setIsAdminDashboardReady(true);
          setErrorMessage("");
        }
      } catch {
        // Fail closed when the profile cannot be read or contains an unknown role.
        if (!shouldIgnore) {
          setIsAdminDashboardReady(false);
          setErrorMessage(dashboardLoadError);
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

  if (!isAdminDashboardReady) {
    return <DashboardLoadingState />;
  }

  return <ManagerDashboardShell />;
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
