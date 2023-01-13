/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    "@calcom/app-store",
    "@calcom/core",
    "@calcom/dayjs",
    "@calcom/emails",
    "@calcom/embed-core",
    "@calcom/embed-react",
    "@calcom/embed-snippet",
    "@calcom/features",
    "@calcom/lib",
    "@calcom/prisma",
    "@calcom/trpc",
    "@calcom/ui",
  ],
};

module.exports = nextConfig;
