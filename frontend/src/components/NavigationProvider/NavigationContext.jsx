"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Retained compatibility context for callers outside the navbar while static
// role-based navigation is verified across the shell.
const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [links, setLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState("");

  useEffect(() => {
    // Navigation documents are intentionally ignored. Static role enforcement
    // now lives in ProtectedRoute and Firestore Security Rules.
    const timeoutId = window.setTimeout(() => {
      setLinks([]);
      setLinksError("");
      setIsLoadingLinks(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        links,
        setLinks,
        isLoadingLinks,
        linksError,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook for safely accessing navigation context values.
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider.");
  }

  return context;
}
