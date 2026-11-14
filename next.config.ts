import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev only: let a phone on the home Wi-Fi open the dev server by LAN IP (HMR is blocked otherwise)
  allowedDevOrigins: ['192.168.1.*'],
  cacheComponents: true,
  partialPrefetching: true,
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
