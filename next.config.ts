import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Plant_Guessing_Game",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.inaturalist.org",
      },
      {
        protocol: "https",
        hostname: "inaturalist-open-data.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
