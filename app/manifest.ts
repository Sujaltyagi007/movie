import type { MetadataRoute } from "next";
import { SPLASH_BACKGROUND, THEME_COLORS } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Reelio — Find your next favorite film", short_name: "Reelio",
    description: "Discover trending, top rated and upcoming movies and series, powered by TMDB.",
    start_url: "/", scope: "/", display: "standalone", orientation: "any",
    background_color: SPLASH_BACKGROUND, theme_color: THEME_COLORS.dark,
    categories: ["entertainment", "movies"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search", icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }] },
      { name: "Movies", url: "/movies", icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }] },
      { name: "TV Shows", url: "/tv", icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
