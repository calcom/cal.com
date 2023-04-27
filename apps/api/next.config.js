const { withAxiom } = require("next-axiom");

module.exports = withAxiom({
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
});
