"use client";

import Login from "@/components/Login/Login.jsx";

export default function Home() {
  // Public landing route for unauthenticated users.
  return (
    <main>
      <Login />
    </main>
  );
}
