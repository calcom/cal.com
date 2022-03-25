const withTM = require("next-transpile-modules")([
  "@calcom/prisma",
]);


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
