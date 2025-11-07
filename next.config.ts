import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Skip static generation for pages that require Supabase
  // This prevents build-time errors when environment variables are not available
  output: 'standalone',
};

export default nextConfig;
