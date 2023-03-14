/* eslint-disable @typescript-eslint/no-var-requires */
const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.js",
  unstable_staticImage: true,
});
module.exports = withNextra({
  async rewrites() {
    return [
      // This redirects requests recieved at /api to /public-api to workaround nextjs default use of /api.
      {
        source: "/api",
        destination: "/public-api",
      },
    ];
  },
});
