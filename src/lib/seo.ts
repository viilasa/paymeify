import type { Metadata } from "next";

import { PRODUCTION_ORIGIN, appUrl } from "@/lib/env";

export function siteUrl(): string {
  return appUrl();
}

export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const site = {
  name: "Paymeify",
  tagline: "Projects delivered. Payments tracked.",
  description:
    "Milestone tracker and payment collector for freelancers in India and worldwide. Create a project, share one private link, and get paid by UPI, Razorpay, or Stripe as you deliver.",
  locale: "en_IN",
  language: "en-IN",
  region: "IN",
  placename: "India",
  keywords: [
    "freelancer milestone payments",
    "UPI freelance payments India",
    "GPay client portal",
    "Razorpay payment links",
    "Stripe milestone checkout",
    "project milestone tracker",
  ],
} as const;

export const publicIndexRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/demo", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/login", changeFrequency: "yearly" as const, priority: 0.3 },
] as const;

export const robotsDisallow = [
  "/dashboard",
  "/projects",
  "/settings",
  "/p/",
  "/api/",
  "/auth/",
  "/forgot-password",
  "/reset-password",
] as const;

export function geoOther(): Metadata["other"] {
  return {
    "geo.region": site.region,
    "geo.placename": site.placename,
    "ICBM": "20.5937, 78.9629",
  };
}

export function graphJsonLd() {
  const url = PRODUCTION_ORIGIN;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: site.name,
        url,
        description: site.description,
        areaServed: [
          { "@type": "Country", name: "India" },
          { "@type": "Place", name: "Worldwide" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: site.name,
        inLanguage: site.language,
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: site.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description: site.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        areaServed: { "@type": "Country", name: "India" },
        inLanguage: site.language,
      },
    ],
  };
}
