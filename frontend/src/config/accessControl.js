import { ROLE } from "@/firebase/authRoleService";

// Static navigation links used by the shell.
// Keep labels in English and align role-gated links with Firestore Security Rules.

export const navigationLinks = [
  // Guest-only links are visible only when no authenticated session exists.
  { href: "/login", label: "Login", visibility: "guest" },
  // Public visitors use the logo as the home link; open registration is invite-only.

  // Authenticated-only links are visible after login.
  {
    href: "/dashboard",
    label: "Personal Area",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },
  {
    href: "/programs",
    label: "Programs",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },

  // Internal manager links should not be shown to client accounts.
  {
    href: "/clients",
    label: "Clients",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },
  {
    href: "/events",
    label: "Meetings",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },
  {
    href: "/admin",
    label: "Admin Dashboard",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },
  {
    href: "/statistic",
    label: "Statistics",
    visibility: "authenticated",
    allowedRoles: [ROLE.ADMIN],
  },
];

// Function to filter navigation links based on user authentication status and role.
export const getVisibleLinks = (links, currentUser, userRole) =>
  links.filter((link) => {
    if (link.showInNavigation === false) {
      return false;
    }

    if (link.visibility === "guest") {
      return !currentUser;
    }

    if (link.visibility === "authenticated" && !currentUser) {
      return false;
    }

    // Authenticated links without allowedRoles are visible to every signed-in user.
    if (!link.allowedRoles || link.allowedRoles.length === 0) {
      return Boolean(currentUser);
    }

    return link.allowedRoles.includes(userRole);
  });

// Find the route policy that applies to the provided authenticated pathname.
const getRoutePolicy = (pathname) =>
  navigationLinks.find(
    (link) =>
      link.visibility === "authenticated" &&
      (pathname === link.href || pathname.startsWith(`${link.href}/`)),
  );

// This function can be used by route guards or protected page components to
// prevent users without the required role from accessing restricted pages.
export const canAccessPath = (pathname, userRole) => {
  const routePolicy = getRoutePolicy(pathname);

  if (!routePolicy) {
    return false;
  }

  if (!routePolicy.allowedRoles || routePolicy.allowedRoles.length === 0) {
    return false;
  }

  return routePolicy.allowedRoles.includes(userRole);
};
