/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http',  hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    API_URL:              process.env.API_URL              || 'http://127.0.0.1:8000',
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
};
module.exports = nextConfig;
