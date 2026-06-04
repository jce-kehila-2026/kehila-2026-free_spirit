export const navigationLinks = [
  {
    label: "Login",
    href: "/",
    visibility: "guest",
  },
  {
    label: "Sign Up",
    href: "/signup",
    visibility: "guest",
  },
  {
    label: "Manage Programs",
    href: "/manage-programs",
    visibility: "authenticated",
    allowedRoles: ["Admin", "Program Manager"],
  },
];

export const getVisibleLinks = (links, currentUser, userRole) =>
  links.filter((link) => {
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

const getRoutePolicy = (pathname) =>
  navigationLinks.find(
    (link) =>
      link.visibility === "authenticated" &&
      (pathname === link.href || pathname.startsWith(`${link.href}/`)),
  );

export const canAccessPath = (pathname, userRole) => {
  const routePolicy = getRoutePolicy(pathname);

  if (!routePolicy?.allowedRoles || routePolicy.allowedRoles.length === 0) {
    return true;
  }

  return routePolicy.allowedRoles.includes(userRole);
};
