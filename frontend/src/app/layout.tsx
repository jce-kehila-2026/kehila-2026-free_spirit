import type { Metadata } from "next";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar/Navbar";
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
          {/* Navbar is mounted globally so auth links and logout are available everywhere. */}
          <Navbar />
          <Toaster />
          {children}
        </NavigationProvider>
      </body>
    </html>
  );
}
