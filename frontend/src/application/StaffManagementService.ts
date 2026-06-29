import {
  createStaffAdminInviteDoc,
  createStaffAdminInviteEmailNotification,
} from "@/firebase/clientDbService";

function createSecureStaffInviteToken(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Secure token generation is not available in this browser.");
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(emailAddress: string): string {
  return emailAddress.trim().toLowerCase();
}

function assertValidEmail(emailAddress: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    throw new Error("Enter a valid staff email address.");
  }
}

/**
 * Generates a role-bound administrator invitation and queues it for email
 * delivery. The invite URL carries role=admin for the downstream signup flow.
 */
export async function queueAdminStaffInviteEmail(
  emailAddress: string,
  origin: string
): Promise<string> {
  const normalizedEmail = normalizeEmail(emailAddress);
  assertValidEmail(normalizedEmail);

  const inviteToken = createSecureStaffInviteToken();
  await createStaffAdminInviteDoc(inviteToken, normalizedEmail);

  const inviteUrl = `${origin}/signup?token=${inviteToken}&role=admin`;
  await createStaffAdminInviteEmailNotification(normalizedEmail, inviteUrl);

  return inviteUrl;
}
