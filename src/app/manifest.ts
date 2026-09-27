import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  // short_name should stay compact (12 chars) for app labels under icons.
  const shortName =
    site.name.length > 12 ? site.name.slice(0, 12) : site.name;

  return {
    name: `${site.fullName} | Express Grocery Store`,
    short_name: shortName,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    orientation: "portrait",
    categories: ["food", "grocery", "shopping"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}