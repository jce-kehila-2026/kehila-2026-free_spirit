// Static navigation fallback used before dynamic Firestore navigation links are loaded.
// Keep labels in English and align role-gated links with Firestore Security Rules.

export const navigationLinks = [
  // Guest-only links are visible only when no authenticated session exists.
  { href: "/login", label: "Login", visibility: "guest" },
  { href: "/signup", label: "Sign Up", visibility: "guest" },
  { href: "/home", label: "Home", visibility: "guest" },

  // Authenticated-only links are visible after login.
  { href: "/manage-programs", label: "Manage Programs", visibility: "authenticated" },
  { href: "/programs", label: "Programs", visibility: "authenticated" },

  // Internal staff links should not be shown to regular client/user accounts.
  { href: "/clients", label: "Clients", visibility: "authenticated", allowedRoles: ["Admin"] },
  {
    href: "/events",
    label: "Events & Follow-ups",
    visibility: "authenticated",
    allowedRoles: ["Admin"],
  },
  {
    href: "/admin",
    label: "Admin Dashboard",
    visibility: "authenticated",
    allowedRoles: ["Admin"],
  },
];