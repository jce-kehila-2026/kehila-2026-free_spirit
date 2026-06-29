"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/firebase/firebase";

const VERIFICATION_POLL_INTERVAL_MS = 3000;

export default function EmailVerificationGate() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let intervalId = null;
    let shouldIgnore = false;
    let wasBlocked = false;

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const unlockIfVerified = (user) => {
      if (!user?.emailVerified) {
        return false;
      }

      stopPolling();
      setIsBlocked(false);

      if (wasBlocked) {
        toast.success("Email verified successfully. System unlocked.");
      }

      wasBlocked = false;
      return true;
    };

    const startPolling = (user) => {
      stopPolling();
      setIsBlocked(true);
      wasBlocked = true;

      intervalId = window.setInterval(async () => {
        const activeUser = auth.currentUser || user;

        if (!activeUser) {
          stopPolling();
          setIsBlocked(false);
          return;
        }

        try {
          await activeUser.reload();
          unlockIfVerified(auth.currentUser || activeUser);
        } catch (error) {
          console.error("Failed to refresh email verification status:", error);
        }
      }, VERIFICATION_POLL_INTERVAL_MS);
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      stopPolling();

      if (shouldIgnore || !user) {
        setIsBlocked(false);
        return;
      }

      try {
        await user.reload();
        const refreshedUser = auth.currentUser || user;

        if (!unlockIfVerified(refreshedUser)) {
          startPolling(refreshedUser);
        }
      } catch (error) {
        console.error("Failed to check email verification status:", error);

        if (!unlockIfVerified(user)) {
          startPolling(user);
        }
      }
    });

    return () => {
      shouldIgnore = true;
      stopPolling();
      unsubscribe();
    };
  }, []);

  if (!isBlocked) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-2xl border border-white/80 bg-[#FFFDF8] px-6 py-7 text-center shadow-2xl">
        <h2 className="text-xl font-bold leading-8 text-[#15383E]">
          Email Verification Required. Please check your inbox and verify your
          email to unlock the system.
        </h2>
      </section>
    </div>
  );
}
