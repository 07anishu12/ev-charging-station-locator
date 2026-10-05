import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:process.env.FASTCHARGER_BUILD_DIR||".next",
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
