import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { agentFeedback: true },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**", search: "" }],
    // 90 is used for the hero banner, where softness is most visible.
    qualities: [75, 90],
    // TMDB image paths are content-addressed (a new image gets a new path), so optimized
    // copies never go stale: keep them 31 days instead of the 4-hour default.
    minimumCacheTTL: 2_678_400,
  },
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
