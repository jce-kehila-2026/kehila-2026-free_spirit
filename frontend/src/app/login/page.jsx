"use client";

import { Suspense } from "react";

import Login from "@/components/Login/Login.jsx";

export default function LoginPage() {
  // Public route for user login.
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
