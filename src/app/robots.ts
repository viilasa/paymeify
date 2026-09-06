import type { MetadataRoute } from "next";

import { PRODUCTION_ORIGIN } from "@/lib/env";
import { robotsDisallow } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...robotsDisallow],
    },
    sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml`,
    host: PRODUCTION_ORIGIN,
  };
}
