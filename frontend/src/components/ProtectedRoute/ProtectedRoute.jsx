"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessPath } from "@/config/accessControl";
import { auth, db } from "@/firebase/firebase";

// Wraps protected route groups and blocks rendering until Firebase confirms auth.
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Prevents protected content from flashing before auth and role checks finish.
  const [authorizedPath, setAuthorizedPath] = useState(null);

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
        const currentAuthUser = auth.currentUser || user;
        await currentAuthUser.reload();
        const refreshedUser = auth.currentUser || currentAuthUser;

        if (!refreshedUser.emailVerified) {
          router.replace("/?emailNotVerified=1");
          return;
        }

        const accountRef = doc(db, "accounts", user.uid);
        const accountSnapshot = await getDoc(accountRef);
        let userRole = "User";

        if (accountSnapshot.exists()) {
          userRole = accountSnapshot.data().role;
        } else {
          await setDoc(accountRef, {
            account_id: user.uid,
            email: refreshedUser.email || "",
            role: userRole,
            created_at: serverTimestamp(),
            last_login: serverTimestamp(),
          });

          if (!shouldIgnore && pathname !== "/home") {
            router.replace("/home");
            return;
          }
        }

        if (shouldIgnore) {
          return;
        }

        if (!canAccessPath(pathname, userRole)) {
          router.replace("/home?accessDenied=1");
          return;
        }

        setAuthorizedPath(pathname);
      } catch (error) {
        console.error("Failed to verify route permissions:", error);

        if (!shouldIgnore) {
          router.replace("/home?accessDenied=1");
        }
      }
    });

    return () => {
      shouldIgnore = true;
      unsubscribe();
    };
  }, [pathname, router]);

  if (authorizedPath !== pathname) {
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
