"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import ClientDataForm from "@/components/clients/forms/ClientDataForm";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import { auth, db } from "@/firebase/firebase";
import {
  CLIENT_EMAIL_VERIFICATION_PATH,
  ACCESS_DENIED_PATH,
  getAccountForUser,
  isArchivedClientRecord,
  isClientRole,
} from "@/firebase/authRoleService";
import freeSpiritLogo from "../../../../docs/design-reference/image.png";

type OnboardingState =
  | { status: "loading"; client: null; message: string }
  | { status: "ready"; client: ClientDoc; message: string }
  | { status: "error"; client: null; message: string };

type AuthAccount = {
  id: string;
  role?: unknown;
  clientId?: unknown;
};

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    status: "loading",
    client: null,
    message: "Loading your onboarding profile...",
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    // Defer the mount flag so the first client render exactly matches SSR.
    const timeoutId = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (!auth || !db) {
      const timeoutId = window.setTimeout(() => {
        setState({
          status: "error",
          client: null,
          message: "Firebase is not initialized.",
        });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    let shouldIgnore = false;
    const activeAuth = auth;
    const activeDb = db;

    const unsubscribe = onAuthStateChanged(activeAuth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        await user.reload();
        const refreshedUser = activeAuth.currentUser || user;

        if (!refreshedUser.emailVerified) {
          router.replace(CLIENT_EMAIL_VERIFICATION_PATH);
          return;
        }

        const account = (await getAccountForUser(user)) as AuthAccount | null;

        if (!account || !isClientRole(account.role)) {
          router.replace("/home");
          return;
        }

        if (!account.clientId || typeof account.clientId !== "string") {
          throw new Error("Your account is not linked to a client profile yet.");
        }

        const clientSnapshot = await getDoc(
          doc(activeDb, "clients", account.clientId),
        );

        if (!clientSnapshot.exists()) {
          throw new Error("Your linked client profile could not be found.");
        }

        if (isArchivedClientRecord(clientSnapshot.data())) {
          // Archived client records must not retain an authenticated onboarding session.
          await signOut(activeAuth);
          router.replace(ACCESS_DENIED_PATH);
          return;
        }

        if (shouldIgnore) {
          return;
        }

        // The clientId comes from accounts/{uid}; Firestore rules then verify
        // the same mapping before allowing this clients/{clientId} read.
        setState({
          status: "ready",
          client: {
            id: clientSnapshot.id,
            ...clientSnapshot.data(),
          } as ClientDoc,
          message: "",
        });
      } catch (error) {
        if (shouldIgnore) {
          return;
        }

        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "permission-denied"
        ) {
          setState({
            status: "error",
            client: null,
            // Permission-denied can happen during the invite-claim propagation
            // window. Only an explicitly read archived record signs the user out.
            message:
              "Your onboarding profile is still being prepared. Please refresh in a moment.",
          });
          return;
        }

        setState({
          status: "error",
          client: null,
          message:
            error instanceof Error
              ? error.message
              : "Unable to load your onboarding profile.",
        });
      }
    });

    return () => {
      shouldIgnore = true;
      unsubscribe();
    };
  }, [isMounted, router]);

  async function handleLogout() {
    if (!auth) {
      setLogoutError("Firebase is not initialized.");
      return;
    }

    setLogoutError("");
    setIsLoggingOut(true);

    try {
      // Keep onboarding standalone while still using Firebase Auth as the
      // session authority; replace history so Back cannot reopen the form.
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Failed to log out.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7FAF5_0%,#EEF5F7_100%)] px-4 py-6 text-[#15383E] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <div className="hidden sm:block" aria-hidden="true" />

          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-[#D7E3D5]">
              <Image
                src={freeSpiritLogo}
                alt="Free Spirit"
                className="h-auto w-full object-contain"
                priority
                sizes="64px"
              />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6A8589]">
                Free Spirit
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#15383E] sm:text-3xl">
                Client Onboarding
              </h1>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-full border border-[#B9CFCA] bg-white/65 px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-white hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </button>
            {logoutError && (
              <p className="max-w-56 text-center text-xs font-semibold text-red-700 sm:text-right">
                {logoutError}
              </p>
            )}
          </div>
        </header>

        {state.status === "ready" ? (
          <ClientDataForm client={state.client} isEditable={true} />
        ) : (
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 text-center shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
            <p className="text-sm font-bold text-[#31585F]">{state.message}</p>
          </section>
        )}
      </div>
    </main>
  );
}
