import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000", "50.50.50.10:3000", "50.50.50.10:3001"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8080/api/:path*',
      },
      // Fallback for requests without trailing slash if needed
      {
        source: '/api/:path',
        destination: 'http://127.0.0.1:8080/api/:path',
      },
    ];
  },
} as any;

export default nextConfig;
