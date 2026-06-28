import type { Metadata } from "next";
import { Toaster } from "sonner";
import AppNavbar from "@/components/Navbar/AppNavbar";
import "./globals.css";
import { NavigationProvider } from "@/components/NavigationProvider/NavigationContext";

export const metadata: Metadata = {
  title: "Kehila Programs",
  description: "Kehila program management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Retain the legacy navigation provider wrapper until the shell is fully verified without it. */}
        <NavigationProvider>
          {/* AppNavbar hides itself only on standalone client-facing flows. */}
          <AppNavbar />
          <Toaster />
          {children}
        </NavigationProvider>
      </body>
    </html>
  );
}
