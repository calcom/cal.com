import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["@calcom/ui"],
  // We are ignoring type errors in this playground to pass build -
  // Calcom UI pulls in appstore and trpc and they have type errors
  // when you dont have their d.ts imported into a workspace
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withMDX(config);
