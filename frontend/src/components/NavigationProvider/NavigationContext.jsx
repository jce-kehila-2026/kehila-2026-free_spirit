"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseInitialized } from "@/firebase/firebase";

// Create the global Context object for navigation settings.
const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [links, setLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState("");

  useEffect(() => {
    let unsubscribeFromLinks = null;

    // Stop the active Firestore listener before starting a new one or unmounting.
    const stopLinksSubscription = () => {
      if (unsubscribeFromLinks) {
        unsubscribeFromLinks();
        unsubscribeFromLinks = null;
      }
    };

        // Keep the app build-safe when Firebase environment variables are unavailable.
    // Defer local state updates so this effect remains compatible with React lint rules.
    if (!isFirebaseInitialized || !auth || !db) {
      const timeoutId = window.setTimeout(() => {
        setLinks([]);
        setLinksError("Firebase is not initialized (missing API key).");
        setIsLoadingLinks(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    // Wait for Firebase Auth to restore the session before reading navigation permissions.
    // This avoids unauthenticated reads against Firestore rules that may require a signed-in user.
    const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
      stopLinksSubscription();
      setLinksError("");

      if (!user) {
        setLinks([]);
        setIsLoadingLinks(false);
        return;
      }

      setIsLoadingLinks(true);

      // Set up a real-time snapshot listener on the navigation_links collection.
      // This allows permission changes in the Admin panel to update active clients without a page refresh.
      unsubscribeFromLinks = onSnapshot(
        collection(db, "navigation_links"),
        (querySnapshot) => {
          const dynamicLinks = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setLinks(dynamicLinks);
          setLinksError("");
          setIsLoadingLinks(false);
        },
        (err) => {
          console.error(
            "Real-time sync error fetching dynamic navigation links:",
            err,
          );
          setLinksError(
            err.message || "Failed to load dynamic navigation permissions.",
          );
          setIsLoadingLinks(false);
        },
      );
    });

    // Clean up both Auth and Firestore listeners to avoid memory leaks.
    return () => {
      unsubscribeFromAuth();
      stopLinksSubscription();
    };
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        links,
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