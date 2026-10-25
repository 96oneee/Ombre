import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set NEXT_IMAGE_UNOPTIMIZED=1 to serve images as they are (static previews, hosts without image resizing).
  images: { unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1" },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
