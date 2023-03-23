const withBundleAnalyzer = require("@next/bundle-analyzer");

const withTM = require("next-transpile-modules")([
  "@calcom/app-store",
  "@calcom/dayjs",
  "@calcom/emails",
  "@calcom/trpc",
  "@calcom/embed-core",
  "@calcom/embed-react",
  "@calcom/features",
  "@calcom/lib",
  "@calcom/prisma",
  "@calcom/ui",
]);
const glob = require("glob");

const plugins = [];
plugins.push(withTM, withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" }));

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["www.datocms-assets.com"],
    formats: ["image/avif", "image/webp"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: { images: { allowFutureImage: true } },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
      config.resolve.fallback = {
        fs: false,
      };
    }
    return config;
  },
};

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
