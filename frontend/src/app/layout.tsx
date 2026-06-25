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
        {/* Wrap the global components inside the dynamic navigation context */}
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
