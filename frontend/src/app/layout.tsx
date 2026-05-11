import type { Metadata } from "next";
import Navbar from "@/components/Navbar/Navbar";
import "./globals.css";

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
        {/* Navbar is mounted globally so auth links and logout are available everywhere. */}
        <Navbar />
        {children}
      </body>
    </html>
  );
}
