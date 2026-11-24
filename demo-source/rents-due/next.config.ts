import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export, served from inside the portfolio repo (WebsitePortfolio/demos/rents-due).
  output: "export",
  basePath: "/WebsitePortfolio/demos/rents-due",
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
