import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000", "50.50.50.10:3000", "50.50.50.10:3001"],
} as any;

export default nextConfig;
