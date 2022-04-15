// https://www.npmjs.com/package/next-transpile-modules
// This makes our @calcom/prisma package from the monorepo to be transpiled and usable by API
const withTM = require("next-transpile-modules")([
  "@calcom/app-store",
  "@calcom/prisma",
  "@calcom/lib",
  "@calcom/ee",
]);

// use something like withPlugins([withTM], {}) if more plugins added later.

module.exports = withTM({
  async headers() {
    return [
      {
        // matching all routes, because we redirect to API in rewrites
        source: "/:path*",
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
      // This redirects requests recieved at / the root to the /api/ folder.
      {
        source: "/:rest*",
        destination: "/api/:rest*",
      },
      // This redirects requests to api/v*/ to /api/ passing version as a query parameter.
      {
        source: "/api/v:version/:rest*",
        destination: "/api/:rest*?version=:version",
      },
    ];
  },
});
