import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.x.ai" },
      { protocol: "https", hostname: "**.xai.com" },
      { protocol: "https", hostname: "img.x.ai" },
    ],
  },
};

export default nextConfig;
