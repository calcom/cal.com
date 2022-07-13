require("dotenv").config({ path: "../../.env" });

const withTM = require("next-transpile-modules")([
  "@calcom/app-store",
  "@calcom/core",
  "@calcom/dayjs",
  "@calcom/ee",
  "@calcom/lib",
  "@calcom/prisma",
  "@calcom/stripe",
  "@calcom/ui",
  "@calcom/emails",
  "@calcom/embed-core",
  "@calcom/embed-react",
  "@calcom/embed-snippet",
]);
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

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false,
    };

    return config;
  },
  async rewrites() {
    const rewrites = {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/:user/avatar.png",
          destination: "/api/user/avatar?username=:user",
        },
        {
          source: "/team/:teamname/avatar.png",
          destination: "/api/user/avatar?teamname=:teamname",
        },
        /* TODO: have these files being served from another deployment or CDN {
          source: "/embed/embed.js",
          destination: process.env.NEXT_PUBLIC_EMBED_LIB_URL?,
        }, */
      ],
      fallback: [],
    };

    /** This logic es specific for our `cal.com` hosted version */
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      const CAL_WEBSITE_SUBDOMAIN_URL = "https://website.cal.com";
      /* Homepage should go to website.cal.com */
      rewrites.beforeFiles.push([
        {
          source: "/",
          has: [
            {
              type: "header",
              key: "referer",
              value: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`,
            },
          ],
          destination: `${CAL_WEBSITE_SUBDOMAIN_URL}/`,
        },
        {
          source: "/_next/static/:static*",
          has: [
            {
              type: "header",
              key: "referer",
              value: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`,
            },
          ],
          destination: `${CAL_WEBSITE_SUBDOMAIN_URL}/_next/static/:static*`,
        },
      ]);
      /* Everything else should fallback to website.cal.com */
      rewrites.fallback.push([
        {
          source: "/:websitePage*",
          destination: CAL_WEBSITE_SUBDOMAIN_URL + "/:websitePage*",
        },
      ]);
    }

    return rewrites;
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

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
