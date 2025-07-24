const withBundleAnalyzer = require("@next/bundle-analyzer");

const plugins = [];
plugins.push(withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" }));

/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://cal.com/ai",
        permanent: true,
      },
    ];
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  reactStrictMode: true,
};

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
