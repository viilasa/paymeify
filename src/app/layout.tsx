import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { JsonLd } from "@/components/seo/json-ld";
import { Toaster } from "@/components/ui/toaster";
import {
  absoluteUrl,
  graphJsonLd,
  organizationJsonLd,
  site,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [{ name: site.name, url: absoluteUrl("/") }],
  creator: site.name,
  publisher: site.name,
  category: "productivity",
  alternates: {
    canonical: "/",
    languages: {
      "en-IN": "/",
      en: "/",
    },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: "/",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.shortDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.shortDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
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
    <html lang={site.language} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <JsonLd
          data={graphJsonLd(
            organizationJsonLd(),
            websiteJsonLd(),
            softwareApplicationJsonLd(),
          )}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
