"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAccessDenied = searchParams.get("accessDenied") === "1";
  const [showAccessDenied, setShowAccessDenied] = useState(hasAccessDenied);

  useEffect(() => {
    if (!hasAccessDenied) {
      return;
    }

    router.replace("/home", { scroll: false });
  }, [hasAccessDenied, router]);

  useEffect(() => {
    if (!showAccessDenied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAccessDenied(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [showAccessDenied]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      {showAccessDenied && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700 shadow-lg"
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
