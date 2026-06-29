"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebase";
import { isAdminRole, isClientRole } from "@/firebase/authRoleService";

// Wraps protected route groups and blocks rendering until Firebase confirms auth.
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Prevents protected content from flashing before auth and role checks finish.
  const [authorizedPath, setAuthorizedPath] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let shouldIgnore = false;
    const redirectTo = (href) => {
      // Marking redirects explicitly keeps protected children unmounted while
      // Next.js transitions away, avoiding unauthorized Firestore queries.
      setIsRedirecting(true);
      router.replace(href);
    };

    // onAuthStateChanged fires after Firebase finishes checking persisted auth.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Unauthenticated users are sent to the canonical login page.
        redirectTo("/login");
        return;
      }

      try {
        const currentAuthUser = auth.currentUser || user;
        await currentAuthUser.reload();

        const accountRef = doc(db, "accounts", user.uid);
        const accountSnapshot = await getDoc(accountRef);

        if (!accountSnapshot.exists()) {
          redirectTo("/login");
          return;
        }

        const userRole = accountSnapshot.data().role;

        if (shouldIgnore) {
          return;
        }

        if (isClientRole(userRole)) {
          // Client accounts are isolated from this protected manager route group.
          // Their own allowed surface is the standalone /onboarding route.
          redirectTo("/onboarding");
          return;
        }

        if (!isAdminRole(userRole)) {
          // Legacy, missing, or unsupported roles fail closed instead of falling
          // through to a manager page with only client-side data-load failures.
          redirectTo("/login");
          return;
        }

        // Admin is the only role authorized for every route in this group.
        setIsRedirecting(false);
        setAuthorizedPath(pathname);
      } catch (error) {
        console.error("Failed to verify route permissions:", error);

        if (!shouldIgnore) {
          redirectTo("/login");
        }
      }
    });

    return () => {
      shouldIgnore = true;
      unsubscribe();
    };
  }, [pathname, router]);

  if (isRedirecting || authorizedPath !== pathname) {
    // Keep a neutral loading state while auth and links context are still being resolved.
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  return children;
}
