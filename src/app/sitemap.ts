import type { MetadataRoute } from "next";

import { PRODUCTION_ORIGIN } from "@/lib/env";
import { publicIndexRoutes } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicIndexRoutes.map((route) => ({
    url: `${PRODUCTION_ORIGIN}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
