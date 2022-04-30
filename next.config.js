const withTM = require("next-transpile-modules")([
  "@calcom/app-store",
  "@calcom/prisma",
  "@calcom/lib",
  "@calcom/ee",
]);

module.exports = withTM({
  async headers() {
    return [
      {
        // @note: disabling CORS matching all API routes as this will be a our Public API
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
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
    return [
      // @note: redirects requests from: "/:rest*" the root level to the "/api/:rest*" folder by default.
      {
        source: "/:rest*",
        destination: "/api/:rest*",
      },
      // @note: redirects requests from api/v*/:rest to /api/:rest?version=* passing version as a query parameter.
      {
        source: "/api/v:version/:rest*",
        destination: "/api/:rest*?version=:version",
      },
    ];
  },
});
