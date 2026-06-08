
//HERE WE DEFINE THE ACCESS CONTROL FOR THE FRONTEND. THIS INCLUDES DEFINING WHICH NAVIGATION LINKS ARE VISIBLE TO WHICH USERS, AND ALSO A FUNCTION TO CHECK IF A USER CAN ACCESS A PARTICULAR PATH BASED ON THEIR ROLE.
export const navigationLinks = [
  // Guest-only links (visible ONLY when NOT logged in)
  { href: "/login", label: "Login", visibility: "guest" },
  { href: "/signup", label: "Sign Up", visibility: "guest" },
  
  // Authenticated-only links (visible ONLY when logged in)   
  { href: "/home", label: "Home", visibility: "authenticated" },   
  { href: "/manage-programs", label: "Manage Programs", visibility: "authenticated" },  
  { href: "/programs", label: "Programs", visibility: "authenticated" },
  { href: "/clients", label: "Clients", visibility: "authenticated" ,allowedRoles: ["Admin"] }, 
  { href: "/events", label: "Events & Follow-ups", visibility: "authenticated" , allowedRoles: ["Admin"]},   
  { href: "/admin", label: "Admin Dashboard", visibility: "authenticated", allowedRoles: ["Admin"] },
  
];
// Function to filter navigation links based on user authentication status and role
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
// Function to check if a user can access a specific path based on their role and the defined navigation links
const getRoutePolicy = (pathname) =>
  navigationLinks.find(
    (link) =>
      link.visibility === "authenticated" &&
      (pathname === link.href || pathname.startsWith(`${link.href}/`)),
  );
// This function can be used in route guards or protected page components to ensure that users without the necessary role cannot access certain pages.
export const canAccessPath = (pathname, userRole) => {
  const routePolicy = getRoutePolicy(pathname);

  if (!routePolicy?.allowedRoles || routePolicy.allowedRoles.length === 0) {
    return true;
  }

  return routePolicy.allowedRoles.includes(userRole);
};
