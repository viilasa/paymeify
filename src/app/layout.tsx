import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PRODUCTION_ORIGIN } from "@/lib/env";
import { geoOther, site } from "@/lib/seo";

import "./globals.css";

const title = "Paymeify — Projects delivered. Payments tracked.";
const description = site.description;

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_ORIGIN),
  title: {
    default: title,
    template: "%s · Paymeify",
  },
  description,
  applicationName: "Paymeify",
  keywords: [...site.keywords],
  alternates: {
    canonical: "/",
    languages: {
      "en-IN": "/",
      en: "/",
    },
  },
  robots: { index: true, follow: true },
  verification: {
    google: site.googleSiteVerification,
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: PRODUCTION_ORIGIN,
    siteName: "Paymeify",
    title,
    description,
    images: [
      {
        url: `${PRODUCTION_ORIGIN}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${PRODUCTION_ORIGIN}/twitter-image`],
  },
  icons: {
    icon: [{ url: "/brand/logo.svg", type: "image/svg+xml" }, { url: "/icon.png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  other: geoOther(),
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
