import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/api/v1/:path*`,
      },
      {
        source: "/health/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/health/:path*`,
      },
    ];
  },
};

export default nextConfig;
