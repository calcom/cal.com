const plugins = [];

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  reactStrictMode: true,
};

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
