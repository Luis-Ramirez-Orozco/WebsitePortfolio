import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export, served from inside the portfolio repo (WebsitePortfolio/demos/gym-leaderboard).
  output: "export",
  basePath: "/WebsitePortfolio/demos/gym-leaderboard",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
