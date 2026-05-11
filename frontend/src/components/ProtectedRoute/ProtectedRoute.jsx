"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/firebase/firebase";

// Wraps protected route groups and blocks rendering until Firebase confirms auth.
export default function ProtectedRoute({ children }) {
  const router = useRouter();

  // Prevents protected content from flashing before Firebase restores the session.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires after Firebase finishes checking persisted auth.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Unauthenticated users are sent to the login page.
        router.replace("/");
        return;
      }

      setIsCheckingAuth(false);
    });

    return unsubscribe;
  }, [router]);

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
