"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessPath } from "@/config/accessControl";
import { auth, db } from "@/firebase/firebase";

// Wraps protected route groups and blocks rendering until Firebase confirms auth.
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Prevents protected content from flashing before auth and role checks finish.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let shouldIgnore = false;

    // onAuthStateChanged fires after Firebase finishes checking persisted auth.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Unauthenticated users are sent to the login page.
        router.replace("/");
        return;
      }

      try {
        const accountRef = doc(db, "accounts", user.uid);
        const accountSnapshot = await getDoc(accountRef);
        const userRole = accountSnapshot.exists()
          ? accountSnapshot.data().role
          : "User";

        if (shouldIgnore) {
          return;
        }

        if (!canAccessPath(pathname, userRole)) {
          router.replace("/?accessDenied=1");
          return;
        }

        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Failed to verify route permissions:", error);

        if (!shouldIgnore) {
          router.replace("/?accessDenied=1");
        }
      }
    });

    return () => {
      shouldIgnore = true;
      unsubscribe();
    };
  }, [pathname, router]);

  if (isCheckingAuth) {
    // Keep a neutral loading state while auth is still being resolved.
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
