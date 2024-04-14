/** @type {import('next').NextConfig} */
require("dotenv").config({ path: "../../.env" });

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@calcom/lib"],
};

module.exports = nextConfig;
