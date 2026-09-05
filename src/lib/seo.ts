import type { Metadata } from "next";

import { appUrl } from "@/lib/env";

/** Public origin used for canonicals, sitemap, Open Graph, and JSON-LD. */
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
    "Milestone tracker and payment collector for freelancers in India and worldwide. Create a project, share one private link, and get paid by UPI or Razorpay as you deliver. Clients never create an account.",
  shortDescription:
    "Create milestones, share one project link, and get paid as you deliver — UPI in India, Razorpay anywhere.",
  locale: "en_IN",
  language: "en-IN",
  keywords: [
    "freelancer milestone payments",
    "client payment portal",
    "UPI freelance payments India",
    "Razorpay payment links",
    "project milestone tracker",
    "get paid per milestone",
    "freelance payment collector",
    "GPay PhonePe Paytm freelancer",
  ],
} as const;

/** Public, indexable routes that belong in the sitemap. */
export const publicIndexRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/faq", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/demo", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/login", changeFrequency: "yearly" as const, priority: 0.3 },
] as const;

/** Paths search engines and AI crawlers should not index. */
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

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    nosnippet: true,
  },
};

export function publicPageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = title.includes(site.name) ? title : `${title} · ${site.name}`;

  return {
    title: title.includes(site.name) ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path,
      languages: {
        "en-IN": path,
        en: path,
      },
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : noIndexRobots,
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: "website",
      locale: site.locale,
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export function organizationJsonLd() {
  const url = siteUrl();
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: site.name,
    url,
    description: site.description,
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "Place", name: "Worldwide" },
    ],
    knowsAbout: [
      "Freelance milestone payments",
      "UPI",
      "Razorpay",
      "Client payment portals",
    ],
  };
}

export function websiteJsonLd() {
  const url = siteUrl();
  return {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: site.name,
    description: site.shortDescription,
    inLanguage: site.language,
    publisher: { "@id": `${url}/#organization` },
  };
}

export function softwareApplicationJsonLd() {
  const url = siteUrl();
  return {
    "@type": "SoftwareApplication",
    "@id": `${url}/#app`,
    name: site.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Project management and payments",
    operatingSystem: "Web",
    url,
    description: site.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Milestone-based project tracking",
      "Private client portal with no account required",
      "UPI QR payments for Indian clients (GPay, PhonePe, Paytm)",
      "Razorpay payment links for cards and other currencies",
      "Payment status that only changes on a verified webhook or owner confirmation",
    ],
    audience: {
      "@type": "Audience",
      audienceType: "Freelancers and independent studios",
      geographicArea: { "@type": "Country", name: "India" },
    },
    areaServed: { "@type": "Country", name: "India" },
    inLanguage: site.language,
    publisher: { "@id": `${url}/#organization` },
  };
}

export function howToJsonLd() {
  return {
    "@type": "HowTo",
    name: "How to collect milestone payments with Paymeify",
    description:
      "Create a project, share one private link, and get paid as you deliver — by UPI in India or Razorpay elsewhere.",
    inLanguage: site.language,
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Create the project",
        text: "Add your client and break the work into milestones with an amount on each one.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Share one link",
        text: "Send the private project link. Your client opens it with no account, login, or app.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Get paid as you deliver",
        text: "The client pays the current milestone by UPI QR or Razorpay. Status updates when the payment is confirmed.",
      },
    ],
  };
}

export function faqJsonLd(items: readonly { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  crumbs: readonly { name: string; path: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function graphJsonLd(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
