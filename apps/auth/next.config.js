require("dotenv").config({ path: "../../.env" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    "@calcom/app-store-cli",
    "@calcom/app-store",
    "@calcom/config",
    "@calcom/core",
    "@calcom/dayjs",
    "@calcom/embed-core",
    "@calcom/embed-react",
    "@calcom/embed-snippet",
    "@calcom/features",
    "@calcom/types",
    "@calcom/lib",
    "@calcom/prisma",
    "@calcom/trpc",
    "@calcom/tsconfig",
    "@calcom/ui",
  ],
  rewrites() {
    return [
      {
        source: "/auth/:rest*",
        destination: process.env.NEXT_PUBLIC_WEBAPP_URL + "/auth/:rest*",
      },
    ];
  },
};

module.exports = nextConfig;
