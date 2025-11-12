import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Skip static generation for pages that require Supabase
  // This prevents build-time errors when environment variables are not available
  output: 'standalone',
  // Disable ESLint during build to avoid deprecated options warning
  // ESLint will still run during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_HUB_URL: process.env.NEXT_PUBLIC_HUB_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
