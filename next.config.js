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
