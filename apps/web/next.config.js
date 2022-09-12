require("dotenv").config({ path: "../../.env" });
const CopyWebpackPlugin = require("copy-webpack-plugin");

const withTM = require("next-transpile-modules")([
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

const { withAxiom } = require("next-axiom");
const { i18n } = require("./next-i18next.config");

if (!process.env.NEXTAUTH_SECRET) throw new Error("Please set NEXTAUTH_SECRET");
if (!process.env.CALENDSO_ENCRYPTION_KEY) throw new Error("Please set CALENDSO_ENCRYPTION_KEY");

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

if (!process.env.EMAIL_FROM) {
  console.warn(
    "\x1b[33mwarn",
    "\x1b[0m",
    "EMAIL_FROM environment variable is not set, this may indicate mailing is currently disabled. Please refer to the .env.example file."
  );
}

if (!process.env.NEXTAUTH_URL) throw new Error("Please set NEXTAUTH_URL");

const validJson = (jsonString) => {
  try {
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
};

if (process.env.GOOGLE_API_CREDENTIALS && !validJson(process.env.GOOGLE_API_CREDENTIALS)) {
  console.warn(
    "\x1b[33mwarn",
    "\x1b[0m",
    '- Disabled \'Google Calendar\' integration. Reason: Invalid value for GOOGLE_API_CREDENTIALS environment variable. When set, this value needs to contain valid JSON like {"web":{"client_id":"<clid>","client_secret":"<secret>","redirect_uris":["<yourhost>/api/integrations/googlecalendar/callback>"]}. You can download this JSON from your OAuth Client @ https://console.cloud.google.com/apis/credentials.'
  );
}

const plugins = [];
if (process.env.ANALYZE === "true") {
  // only load dependency if env `ANALYZE` was set
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: true,
  });
  plugins.push(withBundleAnalyzer);
}

plugins.push(withTM);
plugins.push(withAxiom);

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n,
  /* We already do type check on GH actions */
  typescript: {
    ignoreBuildErrors: !!process.env.CI,
  },
  /* We already do linting on GH actions */
  eslint: {
    ignoreDuringBuilds: !!process.env.CI,
  },
  experimental: {
    images: {
      unoptimized: true,
    },
  },
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "../../packages/app-store/**/static/**",
            to({ context, absoluteFilename }) {
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
        source: "/forms/:formId",
        destination: "/apps/routing_forms/routing-link/:formId",
      },
      {
        source: "/router",
        destination: "/apps/routing_forms/router",
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
        source: "/settings",
        destination: "/settings/profile",
        permanent: true,
      },
      /* V2 testers get redirected to the new settings */
      {
        source: "/settings/profile",
        has: [{ type: "cookie", key: "calcom-v2-early-access" }],
        destination: "/settings/my-account/profile",
        permanent: false,
      },
      {
        source: "/settings/security",
        has: [{ type: "cookie", key: "calcom-v2-early-access" }],
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

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
