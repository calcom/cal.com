/* eslint-disable @typescript-eslint/no-var-requires */
const withTM = require("@vercel/edge-functions-ui/transpile")(["react-timezone-select"]);
const { i18n } = require("./next-i18next.config");

// So we can test deploy previews preview
if (process.env.VERCEL_URL && !process.env.BASE_URL) {
  process.env.BASE_URL = "https://" + process.env.VERCEL_URL;
}
if (process.env.BASE_URL) {
  process.env.NEXTAUTH_URL = process.env.BASE_URL + "/api/auth";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = process.env.BASE_URL;
}
process.env.NEXT_PUBLIC_BASE_URL = process.env.BASE_URL;

if (!process.env.EMAIL_FROM) {
  console.warn(
    "\x1b[33mwarn",
    "\x1b[0m",
    "EMAIL_FROM environment variable is not set, this may indicate mailing is currently disabled. Please refer to the .env.example file."
  );
}

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

// prettier-ignore
module.exports = () => plugins.reduce((acc, next) => next(acc), {
  i18n,
  eslint: {
    // This allows production builds to successfully complete even if the project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
    ]
  },
  async redirects() {
    return [
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
    ];
  },
});
