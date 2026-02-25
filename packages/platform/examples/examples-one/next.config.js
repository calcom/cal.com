/* eslint-disable */
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  reactStrictMode: true,
  transpilePackages: ["@calcom/platform-constants"],
  webpack: (config, { webpack, buildId }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
    };
    return config;
  },
};

module.exports = nextConfig;
