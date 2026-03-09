import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000", "50.50.50.10:3000", "50.50.50.10:3001"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://50.50.50.20:8080/api/:path*',
      },
    ];
  },
} as any;

export default nextConfig;
