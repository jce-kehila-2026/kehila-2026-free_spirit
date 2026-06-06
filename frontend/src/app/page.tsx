"use client";

import Welcome from "@/app/(protected)/home/page.jsx";

export default function Home() {
  // Public landing route for unauthenticated users.
  return (
    <main>
      <Welcome />
    </main>
  );
}
