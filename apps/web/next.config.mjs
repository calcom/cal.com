import { withAxiom } from "next-axiom";
import NTM from "next-transpile-modules";

import i18nConfig from "@calcom/config/next-i18next.config.js";

import { env } from "../../env/server.mjs";

const withTM = NTM([
  "@calcom/app-store",
  "@calcom/core",
  "@calcom/dayjs",
  "@calcom/emails",
  "@calcom/embed-core",
  "@calcom/embed-react",
  "@calcom/embed-snippet",
  "@calcom/features",
  "@calcom/lib",
  "@calcom/prisma",
  "@calcom/trpc",
  "@calcom/ui",
]);

// So we can test deploy previews preview
if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_WEBAPP_URL) {
  process.env.NEXT_PUBLIC_WEBAPP_URL = "https://" + process.env.VERCEL_URL;
}
if (process.env.NEXT_PUBLIC_WEBAPP_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_WEBAPP_URL + "/api/auth";
}
if (!process.env.NEXT_PUBLIC_WEBSITE_URL) {
  process.env.NEXT_PUBLIC_WEBSITE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
}

const plugins = [];
if (process.env.ANALYZE === "true") {
  (async () => {
    // only load dependency if env `ANALYZE` was set
    const bundleAnalyzer = await (await import("@next/bundle-analyzer")).default;
    const withBundleAnalyzer = bundleAnalyzer({
      enabled: true,
    });
    plugins.push(withBundleAnalyzer);
  })();
}

plugins.push(withTM);
plugins.push(withAxiom);

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n: i18nConfig.i18n,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false,
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/:user/avatar.png",
        destination: "/api/user/avatar?username=:user",
      },
      {
        source: "/team/:teamname/avatar.png",
        destination: "/api/user/avatar?teamname=:teamname",
      },
      {
        source: "/forms/:formId",
        destination: "/apps/routing_forms/routing-link/:formId",
      },
      /* TODO: have these files being served from another deployment or CDN {
        source: "/embed/embed.js",
        destination: process.env.NEXT_PUBLIC_EMBED_LIB_URL?,
      }, */
    ];
  },
  async redirects() {
    const redirects = [
      {
        source: "/settings",
        destination: "/settings/profile",
        permanent: true,
      },
      {
        source: "/bookings",
        destination: "/bookings/upcoming",
        permanent: true,
      },
      {
        source: "/call/:path*",
        destination: "/video/:path*",
        permanent: false,
      },
    ];

    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      redirects.push(
        {
          source: "/apps/dailyvideo",
          destination: "/apps/daily-video",
          permanent: true,
        },
        {
          source: "/apps/huddle01_video",
          destination: "/apps/huddle01",
          permanent: true,
        },
        {
          source: "/apps/jitsi_video",
          destination: "/apps/jitsi",
          permanent: true,
        }
      );
    }

    return redirects;
  },
};

const config = plugins.reduce((acc, next) => next(acc), nextConfig);

export default config;
