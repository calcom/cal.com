const { withAxiom } = require("next-axiom");
const { withSentryConfig } = require("@sentry/nextjs");

const plugins = [withAxiom];
const nextConfig = {
  transpilePackages: [
    "@calcom/app-store",
    "@calcom/core",
    "@calcom/dayjs",
    "@calcom/emails",
    "@calcom/features",
    "@calcom/lib",
    "@calcom/prisma",
    "@calcom/trpc",
  ],
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
        // This redirects requests recieved at / the root to the /api/ folder.
        {
          source: "/v:version/:rest*",
          destination: "/api/v:version/:rest*",
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

if (!!process.env.NEXT_PUBLIC_SENTRY_DSN) {
  nextConfig["sentry"] = {
    autoInstrumentServerFunctions: true,
    hideSourceMaps: true,
  };

  plugins.push(withSentryConfig);
}

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
