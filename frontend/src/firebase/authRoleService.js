import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";

export const ROLE = Object.freeze({
  ADMIN: "admin",
  CLIENT: "client",
});

const CANONICAL_ROLES = new Set(Object.values(ROLE));
const MANAGER_FALLBACK_PATH = "/home";
const CLIENT_ONBOARDING_PATH = "/onboarding";
export const ACCESS_DENIED_PATH = "/access-denied?inactive=1";
export const CLIENT_EMAIL_VERIFICATION_PATH = "/login?emailNotVerified=1";
export const EXPIRED_CLIENT_INVITE_MESSAGE =
  "This onboarding invitation has expired. Please contact Free Spirit administration for a new link.";
export const INACTIVE_CLIENT_ACCOUNT_MESSAGE =
  "חשבונך אינו פעיל כעת. אנא פנה להנהלת Free Spirit. / Your account is currently inactive. Please contact Free Spirit administration.";

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
  return normalizeRole(role) === ROLE.CLIENT;
}

export function isAdminRole(role) {
  return normalizeRole(role) === ROLE.ADMIN;
}

export function isCanonicalRole(role) {
  return CANONICAL_ROLES.has(normalizeRole(role));
}

export function isArchivedClientRecord(clientData) {
  // Only explicit archive markers may disable a client session. Transitional
  // onboarding states such as "invited" and "registered" must remain active.
  const status = normalizeRole(clientData?.status);
  return clientData?.is_archived === true || status === "Archived";
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
 * after authentication. Invalid or legacy roles fail closed to login so stale
 * `User`, `Client`, or `Program Manager` account states cannot inherit access.
 */
export async function getPostLoginRedirect(user) {
  const account = await getAccountForUser(user);

  if (!account || !isCanonicalRole(account.role)) {
    return "/login";
  }

  await stampAccountLogin(user);

  if (isAdminRole(account.role)) {
    return MANAGER_FALLBACK_PATH;
  }

  if (account.clientId && typeof account.clientId === "string") {
    const activeDb = requireFirestore();
    try {
      const clientSnapshot = await getDoc(doc(activeDb, "clients", account.clientId));

      // Archived client records are denied before the onboarding surface renders.
      // Missing or transitional statuses are not inactive-account evidence.
      if (clientSnapshot.exists() && isArchivedClientRecord(clientSnapshot.data())) {
        return ACCESS_DENIED_PATH;
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "permission-denied"
      ) {
        // During invite signup, Auth can observe the new user before the
        // Firestore claim transaction is fully readable. Do not sign out or
        // redirect unless an explicit archived client document was read above.
        return CLIENT_ONBOARDING_PATH;
      }

      throw error;
    }
  }

  // Email verification is enforced by the global blocking gate after routing.
  return CLIENT_ONBOARDING_PATH;
}

/**
 * Reads the unified invitation token query parameter used by signup links.
 */
export function getInviteTokenFromCurrentUrl() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return (params.get("token") || "").trim();
}

function getInviteExpiryMillis(invite) {
  const expiresAt = invite?.expiresAt;

  if (expiresAt && typeof expiresAt.toMillis === "function") {
    return expiresAt.toMillis();
  }

  if (expiresAt instanceof Date) {
    return expiresAt.getTime();
  }

  if (typeof expiresAt === "string" || typeof expiresAt === "number") {
    const parsedExpiry = new Date(expiresAt).getTime();
    return Number.isNaN(parsedExpiry) ? 0 : parsedExpiry;
  }

  return 0;
}

function assertInviteCanBeClaimed(invite) {
  if (invite.status && invite.status !== "pending") {
    throw new Error("This invite link has already been used.");
  }

  if (invite.role === ROLE.ADMIN) {
    return;
  }

  if (!invite.clientId || typeof invite.clientId !== "string") {
    throw new Error("This invite link is missing a client record.");
  }

  // Missing or past expiry values fail closed so legacy tokens cannot bypass the 24-hour policy.
  if (getInviteExpiryMillis(invite) <= Date.now()) {
    throw new Error(EXPIRED_CLIENT_INVITE_MESSAGE);
  }
}

/**
 * Validates an invite before account creation. The transaction and Firestore
 * rules repeat the same checks during claim, so this only protects UX and avoids
 * creating a new Firebase Auth user for an already expired onboarding link.
 */
export async function validateClientInviteToken(inviteToken) {
  if (!inviteToken) return null;

  const activeDb = requireFirestore();
  // Invitation tokens are stored as client_invites document IDs, so validation
  // must read the exact token document rather than querying by a field.
  const inviteSnapshot = await getDoc(doc(activeDb, "client_invites", inviteToken));

  if (!inviteSnapshot.exists()) {
    throw new Error("This invite link is invalid or expired.");
  }

  const invite = inviteSnapshot.data();
  assertInviteCanBeClaimed(invite);

  return invite;
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
    assertInviteCanBeClaimed(invite);

    if (invite.role === ROLE.ADMIN) {
      transaction.set(
        accountRef,
        {
          account_id: user.uid,
          email: user.email || invite.email || "",
          role: ROLE.ADMIN,
          staffInviteToken: inviteToken,
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

      return { role: ROLE.ADMIN };
    }

    const clientRef = doc(activeDb, "clients", invite.clientId);
    transaction.set(
      accountRef,
      {
        account_id: user.uid,
        email: user.email || "",
        role: ROLE.CLIENT,
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
      // The client becomes registered only after a real Firebase Auth account
      // successfully claims the pending invite token.
      status: "registered",
      updated_at: serverTimestamp(),
    });

    return invite.clientId;
  });
}
