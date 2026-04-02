/* eslint-disable */
import process from "node:process";
const { withAxiom } = require("next-axiom");
const { withSentryConfig } = require("@sentry/nextjs");
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
const { TRIGGER_VERSION } = require("./trigger.version.js");
const plugins = [withAxiom];

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {},
  transpilePackages: [
    "@calcom/app-store",
    "@calcom/dayjs",
    "@calcom/emails",
    "@calcom/features",
    "@calcom/lib",
    "@calcom/prisma",
    "@calcom/trpc",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/docs",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS, PATCH, DELETE, POST, PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type, api_key, Authorization",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      afterFiles: [
        // This redirects requests received at / the root to the /api/ folder.
        {
          source: "/v:version/:rest*",
          destination: "/api/v:version/:rest*",
        },
        {
          source: "/api/v2",
          destination: `${process.env.NEXT_PUBLIC_API_V2_ROOT_URL}/health`,
        },
        {
          source: "/api/v2/health",
          destination: `${process.env.NEXT_PUBLIC_API_V2_ROOT_URL}/health`,
        },
        {
          source: "/api/v2/docs/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_V2_ROOT_URL}/docs/:path*`,
        },
        {
          source: "/api/v2/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_V2_ROOT_URL}/api/v2/:path*`,
        },
        // This redirects requests to api/v*/ to /api/ passing version as a query parameter.
        {
          source: "/api/v:version/:rest*",
          destination: "/api/:rest*?version=:version",
        },
        // Keeps backwards compatibility with old webhook URLs
        {
          source: "/api/hooks/:rest*",
          destination: "/api/webhooks/:rest*",
        },
      ],
      fallback: [
        // These rewrites are checked after both pages/public files
        // and dynamic routes are checked
        {
          source: "/:path*",
          destination: `/api/:path*`,
        },
      ],
    };
  },
};

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  plugins.push((nextConfig) =>
    withSentryConfig(nextConfig, {
      autoInstrumentServerFunctions: true,
      hideSourceMaps: true,
    })
  );
}

const env = process.env;

if (process.env.NODE_ENV === "production" || process.env.CALCOM_ENV === "production") {
  env.TRIGGER_VERSION = TRIGGER_VERSION;
}

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
