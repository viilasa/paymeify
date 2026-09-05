import type { MetadataRoute } from "next";

import { site } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    lang: site.language,
    categories: ["business", "finance", "productivity"],
  };
}
