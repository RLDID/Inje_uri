import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  webpack: (config) => {
    // Windows + Node 24 can misreport readlink errors for regular files.
    config.cache = false;
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@prisma/client/runtime/query_compiler_bg.postgresql.mjs':
        '@prisma/client/runtime/query_compiler_bg.postgresql.js',
      '@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs':
        '@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js',
    };

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
