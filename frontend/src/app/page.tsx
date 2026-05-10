"use client";

import Login from "@/components/Login/Login.jsx";

export default function Home() {
  // Now simply rendering the Login component. 
  // Next.js handles the routing context automatically!
  return (
    <main>
      <Login />
    </main>
  );
}