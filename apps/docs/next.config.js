const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.js",
  unstable_staticImage: true,
});
module.exports = withNextra({
  async rewrites() {
    return [
      // This redirects requests recieved at / the root to the /api/ folder.
      {
        source: "/api",
        destination: "https://developer.cal.com/",
      },
    ];
  },
});
