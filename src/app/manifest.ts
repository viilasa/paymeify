import type { MetadataRoute } from "next";

import { PRODUCTION_ORIGIN } from "@/lib/env";
import { site } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: PRODUCTION_ORIGIN,
    id: PRODUCTION_ORIGIN,
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    lang: site.language,
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
