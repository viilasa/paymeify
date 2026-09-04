import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Paymeify — Projects delivered. Payments tracked.",
    template: "%s · Paymeify",
  },
  description:
    "Create milestones, share one project link, and get paid as you deliver.",
  applicationName: "Paymeify",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
