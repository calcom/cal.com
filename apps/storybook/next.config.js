const withTM = require("next-transpile-modules")(["@calcom/dayjs", "@calcom/ui"]);
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: false,
  },
};

module.exports = withTM(nextConfig);
