const withBundleAnalyzer = require("@next/bundle-analyzer");

const plugins = [];
plugins.push(withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" }));

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  reactStrictMode: true,
};

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
