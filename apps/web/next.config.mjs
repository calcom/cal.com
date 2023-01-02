import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { withAxiom } from "next-axiom";
import NTM from "next-transpile-modules";
import os from "os";

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
// Check for configuration of NEXTAUTH_URL before overriding
if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_WEBAPP_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_WEBAPP_URL + "/api/auth";
}
if (!process.env.NEXT_PUBLIC_WEBSITE_URL) {
  process.env.NEXT_PUBLIC_WEBSITE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
}

const plugins = [];
if (process.env.ANALYZE === "true") {
  (async () => {
    // only load dependency if env `ANALYZE` was set
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
  productionBrowserSourceMaps: true,
  /* We already do type check on GH actions */
  typescript: {
    ignoreBuildErrors: !!process.env.CI,
  },
  /* We already do linting on GH actions */
  eslint: {
    ignoreDuringBuilds: !!process.env.CI,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "../../packages/app-store/**/static/**",
            to({ context, absoluteFilename }) {
              // Adds compatibility for windows path
              if (os.platform() === "win32") {
                const absoluteFilenameWin = absoluteFilename.replaceAll("\\", "/");
                const contextWin = context.replaceAll("\\", "/");
                const appName = /app-store\/(.*)\/static/.exec(absoluteFilenameWin);
                return Promise.resolve(`${contextWin}/public/app-store/${appName[1]}/[name][ext]`);
              }
              const appName = /app-store\/(.*)\/static/.exec(absoluteFilename);
              return Promise.resolve(`${context}/public/app-store/${appName[1]}/[name][ext]`);
            },
          },
        ],
      })
    );

    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false,
    };

    /**
     * TODO: Find more possible barrels for this project.
     *  @see https://github.com/vercel/next.js/issues/12557#issuecomment-1196931845
     **/
    config.module.rules.push({
      test: [/lib\/.*.tsx?/i],
      sideEffects: false,
    });

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
        source: "/forms/:formQuery*",
        destination: "/apps/routing-forms/routing-link/:formQuery*",
      },
      {
        source: "/router",
        destination: "/apps/routing-forms/router",
      },
      {
        source: "/success/:path*",
        has: [
          {
            type: "query",
            key: "uid",
            value: "(?<uid>.*)",
          },
        ],
        destination: "/booking/:uid/:path*",
      },
      {
        source: "/cancel/:path*",
        destination: "/booking/:path*",
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
        source: "/api/app-store/:path*",
        destination: "/app-store/:path*",
        permanent: true,
      },
      {
        source: "/auth/signup",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/settings",
        destination: "/settings/my-account/profile",
        permanent: true,
      },
      {
        source: "/settings/teams",
        destination: "/teams",
        permanent: true,
      },
      /* V2 testers get redirected to the new settings */
      {
        source: "/settings/profile",
        destination: "/settings/my-account/profile",
        permanent: false,
      },
      {
        source: "/settings/security",
        destination: "/settings/security/password",
        permanent: false,
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
      /* Attempt to mitigate DDoS attack */
      {
        source: "/api/auth/:path*",
        has: [
          {
            type: "query",
            key: "callbackUrl",
            // prettier-ignore
            value: "^(?!https?:\/\/).*$",
          },
        ],
        destination: "/404",
        permanent: false,
      },
      {
        source: "/booking/direct/:action/:email/:bookingUid/:oldToken",
        destination: "/api/link?action=:action&email=:email&bookingUid=:bookingUid&oldToken=:oldToken",
        permanent: true,
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

const sentryWebpackPluginOptions = {
  silent: true, // Suppresses all logs
};

const moduleExports = () => plugins.reduce((acc, next) => next(acc), nextConfig);

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  nextConfig.sentry = {
    hideSourceMaps: true,
    // Prevents Sentry from running on this Edge function, where Sentry doesn't work yet (build whould crash the api route).
    excludeServerRoutes: [/\/api\/social\/og\/image\/?/],
  };
}

// Sentry should be the last thing to export to catch everything right
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(moduleExports, sentryWebpackPluginOptions)
  : moduleExports;

export default config;
