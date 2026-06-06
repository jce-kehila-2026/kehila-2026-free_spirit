"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

// Create the global Context object for navigation settings
const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [links, setLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState("");

  useEffect(() => {
    /* Internal comments in code are always in English */
    // Set up a real-time web-socket snapshot listener on the 'navigation_links' collection cluster
    // This allows permissions changes in the Admin panel to reflect instantly on all active clients' Navbars without an F5 refresh
    const unsubscribe = onSnapshot(
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
        console.error("Real-time sync error fetching dynamic navigation links:", err);
        setLinksError(err.message || "Failed to load dynamic navigation permissions.");
        setIsLoadingLinks(false);
      }
    );

    // Unsubscribe from the Firestore websocket listener automatically when the provider component unmounts to prevent memory leaks
    return () => unsubscribe();
  }, []);

  return (
    <NavigationContext.Provider value={{ links, isLoadingLinks, linksError, setLinks }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook to consume the navigation state safely inside components like Navbar
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}