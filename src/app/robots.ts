import type { MetadataRoute } from "next";

import { absoluteUrl, robotsDisallow, siteUrl } from "@/lib/seo";

const aiUserAgents = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "ClaudeBot",
  "Anthropic-AI",
  "PerplexityBot",
  "Applebot-Extended",
  "cohere-ai",
  "Amazonbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = [...robotsDisallow];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        userAgent: aiUserAgents,
        allow: ["/", "/faq", "/demo", "/llms.txt", "/llms-full.txt"],
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
