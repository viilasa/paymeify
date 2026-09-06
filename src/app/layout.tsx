import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Toaster } from "@/components/ui/toaster";
import { appUrl } from "@/lib/env";

import "./globals.css";

const title = "Paymeify — Projects delivered. Payments tracked.";
const description =
  "Create milestones, share one project link, and get paid as you deliver.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: title,
    template: "%s · Paymeify",
  },
  description,
  applicationName: "Paymeify",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Paymeify",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  icons: {
    icon: [{ url: "/brand/logo.svg", type: "image/svg+xml" }, { url: "/icon.png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
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
