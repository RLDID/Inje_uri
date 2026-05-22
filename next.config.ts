import type { NextConfig } from 'next';

const ROUTE_REDIRECTS: Array<{ source: string; alias: string }> = [
  { source: '/', alias: '/p/l0g8n' },
  { source: '/login', alias: '/p/l0g8n' },
  { source: '/register', alias: '/p/r4g7x' },
  { source: '/account-recovery', alias: '/p/k2r9v' },
  { source: '/waiting', alias: '/p/w8t2k' },
  { source: '/admin', alias: '/p/z9adm' },
  { source: '/match/:path*', alias: '/p/a83k2/:path*' },
  { source: '/interest/:path*', alias: '/p/h7n4d/:path*' },
  { source: '/chat/:path*', alias: '/p/q91mz/:path*' },
  { source: '/self-date/:path*', alias: '/p/r5t8u/:path*' },
  { source: '/my/:path*', alias: '/p/m6y2p/:path*' },
] as Array<{ source: string; alias: string }>;

const ROUTE_REWRITES: Array<{ source: string; destination: string }> = [
  { source: '/p/l0g8n', destination: '/login' },
  ...ROUTE_REDIRECTS
    .filter(({ source }) => source !== '/' && source !== '/login')
    .map(({ source, alias }) => ({ source: alias, destination: source })),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ['203.241.246.196'],
  async redirects() {
    return ROUTE_REDIRECTS.map(({ source, alias }) => ({
      source,
      destination: alias,
      permanent: false,
    }));
  },
  async rewrites() {
    return ROUTE_REWRITES;
  },
  webpack: (config) => {
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
