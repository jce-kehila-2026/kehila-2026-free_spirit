import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const CLIENT_ROLES = new Set(["client", "Client"]);
const STAFF_ROLES = new Set(["Admin", "Program Manager"]);
const MANAGER_FALLBACK_PATH = "/home";
const CLIENT_ONBOARDING_PATH = "/onboarding";
export const CLIENT_EMAIL_VERIFICATION_PATH = "/login?emailNotVerified=1";

function requireFirestore() {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }

  return db;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim() : "";
}

export function isClientRole(role) {
  return CLIENT_ROLES.has(normalizeRole(role));
}

export function isStaffRole(role) {
  return STAFF_ROLES.has(normalizeRole(role));
}

/**
 * Reads the signed-in user's canonical account profile. Account records are the
 * role source of truth for route decisions and client profile ownership.
 */
export async function getAccountForUser(user) {
  if (!user) return null;

  const activeDb = requireFirestore();
  const accountSnapshot = await getDoc(doc(activeDb, "accounts", user.uid));

  if (!accountSnapshot.exists()) {
    return null;
  }

  return {
    id: accountSnapshot.id,
    ...accountSnapshot.data(),
  };
}

/**
 * Keeps Admin account tables current for every successful auth flow.
 * Uses Firestore Timestamp via serverTimestamp(), matching the existing
 * created_at/last_login rendering expectations in the admin dashboard.
 */
export async function stampAccountLogin(user) {
  if (!user) return;

  const activeDb = requireFirestore();
  await setDoc(
    doc(activeDb, "accounts", user.uid),
    {
      account_id: user.uid,
      email: user.email || "",
      last_login: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Reads the canonical account profile and returns the route users should land on
 * after authentication. Missing account profiles keep the historical manager
 * fallback so existing staff login behavior remains stable.
 */
export async function getPostLoginRedirect(user) {
  const account = await getAccountForUser(user);

  if (!account) {
    return MANAGER_FALLBACK_PATH;
  }

  await stampAccountLogin(user);

  if (!isClientRole(account.role)) {
    return MANAGER_FALLBACK_PATH;
  }

  // Client onboarding is blocked until Firebase Auth confirms the email.
  // Manager/admin fallback behavior stays unchanged because this gate applies
  // only after the canonical Firestore role is known to be a client role.
  return user.emailVerified
    ? CLIENT_ONBOARDING_PATH
    : CLIENT_EMAIL_VERIFICATION_PATH;
}

/**
 * Supports invite links such as /signup?inviteToken=abc, /signup?invite=abc, or
 * /signup?token=abc without committing to one URL shape before the email-link
 * flow is finalized.
 */
export function getInviteTokenFromCurrentUrl() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("inviteToken") ||
    params.get("invite") ||
    params.get("token") ||
    ""
  ).trim();
}

/**
 * Claims an existing manager-created client invite for the signed-in Firebase
 * user. The matching Firestore rules require this account write, invite update,
 * and client uid update to succeed together, preventing arbitrary clientId
 * self-assignment from the browser.
 */
export async function claimClientInviteForUser(user, inviteToken) {
  if (!user || !inviteToken) return null;

  const activeDb = requireFirestore();
  const inviteRef = doc(activeDb, "client_invites", inviteToken);
  const accountRef = doc(activeDb, "accounts", user.uid);

  return runTransaction(activeDb, async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteRef);

    if (!inviteSnapshot.exists()) {
      throw new Error("This invite link is invalid or expired.");
    }

    const invite = inviteSnapshot.data();

    if (invite.status && invite.status !== "pending") {
      throw new Error("This invite link has already been used.");
    }

    if (!invite.clientId || typeof invite.clientId !== "string") {
      throw new Error("This invite link is missing a client record.");
    }

    const clientRef = doc(activeDb, "clients", invite.clientId);
    transaction.set(
      accountRef,
      {
        account_id: user.uid,
        email: user.email || "",
        role: "client",
        clientId: invite.clientId,
        clientInviteToken: inviteToken,
        last_login: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );

    transaction.update(inviteRef, {
      status: "claimed",
      claimedByUid: user.uid,
      claimedAt: serverTimestamp(),
    });

    transaction.update(clientRef, {
      uid: user.uid,
      updated_at: serverTimestamp(),
    });

    return invite.clientId;
  });
}
