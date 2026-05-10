"use client";

import dynamic from "next/dynamic";
import Login from "@/components/Login/Login";

const RouterProvider = dynamic(
  () => import("@/components/RouterProvider/RouterProvider"),
  {
    ssr: false,
  },
);

export default function Home() {
  // Renders the login component as the main page content.
  return (
    <RouterProvider>
      <Login />
    </RouterProvider>
  );
}
