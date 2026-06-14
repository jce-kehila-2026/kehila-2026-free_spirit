"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";


function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract query parameters instantly during initialization to manage UI states safely
  const isEmailNotVerifiedParam = searchParams.get("emailNotVerified") === "1";
  const isAccessDeniedParam = searchParams.get("accessDenied") === "1";

  // Keeps track of the access denied error alert rendering state
  const [showAccessDenied, setShowAccessDenied] = useState(isAccessDeniedParam);

  useEffect(() => {
    if (!showAccessDenied) {
      return;
    }

    // Delay the URL cleanup and toast dismissal by exactly 2 seconds (2000ms)
    // This prevents Next.js from triggering premature client-side re-renders that flash/erase the toast notice instantly
    const timeoutId = window.setTimeout(() => {
      setShowAccessDenied(false);
      
      // Safely wipe the URL parameters only AFTER the user has fully read the 2-second alert notice
      // This ensures manual browser refreshes (F5) afterward will land on a sterile, unparameterized path
      router.replace("/", { scroll: false });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [showAccessDenied, router]);

  // Fallback safety cleanup hook: if the parameter is present but the toast already closed or wasn't shown
  useEffect(() => {
    if ((isEmailNotVerifiedParam || isAccessDeniedParam) && !showAccessDenied) {
      router.replace("/", { scroll: false });
    }
  }, [isEmailNotVerifiedParam, isAccessDeniedParam, showAccessDenied, router]);

  /* Internal comments in code are always in English */
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      {/* Access Denied Localized Toast Notice - Now completely stable for 2 full seconds */}
      {showAccessDenied && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700 shadow-lg"
          role="alert"
        >
          אין לך הרשאה לגשת לדף זה
        </div>
      )}

      <h1 className="text-center text-4xl font-bold text-slate-950 sm:text-5xl">
        שלום, אתה בדף הבית!
      </h1>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
