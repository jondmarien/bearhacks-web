import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bearhacks/config", "@bearhacks/api-client", "@bearhacks/logger"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
};

export default nextConfig;
