import type { NextConfig } from "next";
import * as path from 'path';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  cacheMaxMemorySize: 0,

  outputFileTracingIncludes: {
    '/product/[id]': ['./src/**/*'],
    '/tracking/[id]': ['./src/**/*'],
  },

  experimental: {
    webpackBuildWorker: true,
  },

  transpilePackages: ['lucide-react'],
  staticPageGenerationTimeout: 120,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },

  generateEtags: true,
  skipTrailingSlashRedirect: true,
};

export default withPWA(nextConfig);
