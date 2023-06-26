require("dotenv").config({ path: "../../.env" });
const CopyWebpackPlugin = require("copy-webpack-plugin");
const os = require("os");
const englishTranslation = require("./public/static/locales/en/common.json");
const { withAxiom } = require("next-axiom");
const { i18n } = require("./next-i18next.config");
const { pages } = require("./pages");

if (!process.env.NEXTAUTH_SECRET) throw new Error("Please set NEXTAUTH_SECRET");
if (!process.env.CALENDSO_ENCRYPTION_KEY) throw new Error("Please set CALENDSO_ENCRYPTION_KEY");

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

if (process.env.CSP_POLICY === "strict" && process.env.NODE_ENV === "production") {
  throw new Error(
    "Strict CSP policy(for style-src) is not yet supported in production. You can experiment with it in Dev Mode"
  );
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

const informAboutDuplicateTranslations = () => {
  const valueSet = new Set();

  for (const key in englishTranslation) {
    if (valueSet.has(englishTranslation[key])) {
      console.warn("\x1b[33mDuplicate value found in:", "\x1b[0m", key);
    } else {
      valueSet.add(englishTranslation[key]);
    }
  }
};

informAboutDuplicateTranslations();

const getSubdomain = () => {
  const _url = new URL(process.env.NEXT_PUBLIC_WEBAPP_URL);
  const regex = new RegExp(/^([a-z]+\:\/{2})?((?<subdomain>[\w-]+)\.[\w-]+\.\w+)$/);
  //console.log(_url.hostname, _url.hostname.match(regex));
  return _url.hostname.match(regex)?.groups?.subdomain || null;
};

const plugins = [];
if (process.env.ANALYZE === "true") {
  // only load dependency if env `ANALYZE` was set
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: true,
  });
  plugins.push(withBundleAnalyzer);
}

plugins.push(withAxiom);

// .* matches / as well(Note: *(i.e wildcard) doesn't match / but .*(i.e. RegExp) does)
// It would match /free/30min but not /bookings/upcoming because 'bookings' is an item in pages
// It would also not match /free/30min/embed because we are ensuring just two slashes
// ?!book ensures it doesn't match /free/book page which doesn't have a corresponding new-booker page.
// [^/]+ makes the RegExp match the full path, it seems like a partial match doesn't work.
// book$ ensures that only /book is excluded from rewrite(which is at the end always) and not /booked

// Important Note: When modifying these RegExps update apps/web/test/lib/next-config.test.ts as well
const userTypeRouteRegExp = `/:user((?!${pages.join("/|")})[^/]*)/:type((?!book$)[^/]+)`;
const teamTypeRouteRegExp = "/team/:slug/:type((?!book$)[^/]+)";
const privateLinkRouteRegExp = "/d/:link/:slug((?!book$)[^/]+)";
const embedUserTypeRouteRegExp = `/:user((?!${pages.join("/|")})[^/]*)/:type/embed`;
const embedTeamTypeRouteRegExp = "/team/:slug/:type/embed";

/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n,
  productionBrowserSourceMaps: true,
  /* We already do type check on GH actions */
  typescript: {
    ignoreBuildErrors: !!process.env.CI,
  },
  /* We already do linting on GH actions */
  eslint: {
    ignoreDuringBuilds: !!process.env.CI,
  },
  transpilePackages: [
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
    "lucide-react",
  ],
  modularizeImports: {
    "@calcom/ui/components/icon": {
      transform: "lucide-react/dist/esm/icons/{{ kebabCase member }}",
      preventFullImport: true,
    },
    "@calcom/features/insights/components": {
      transform: "@calcom/features/insights/components/{{member}}",
      skipDefaultConversion: true,
      preventFullImport: true,
    },
    lodash: {
      transform: "lodash/{{member}}",
    },
    // TODO: We need to have all components in `@calcom/ui/components` in order to use this
    // "@calcom/ui": {
    //   transform: "@calcom/ui/components/{{member}}",
    // },
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { webpack, buildId }) => {
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

    config.plugins.push(new webpack.DefinePlugin({ "process.env.BUILD_ID": JSON.stringify(buildId) }));

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
    const defaultSubdomain = getSubdomain();
    const subdomain = defaultSubdomain ? `(?!${defaultSubdomain})[^.]+` : "[^.]+";

    const beforeFiles = [
      {
        has: [
          {
            type: "host",
            value: `^(?<orgSlug>${subdomain})\\..*`,
          },
        ],
        source: "/",
        destination: "/team/:orgSlug",
      },
      {
        has: [
          {
            type: "host",
            value: `^(?<orgSlug>${subdomain})\\..*`,
          },
        ],
        source: `/:user((?!${pages.join("|")}|_next|public)[a-zA-Z0-9\-_]+)`,
        destination: "/org/:orgSlug/:user",
      },
      {
        has: [
          {
            type: "host",
            value: `^(?<orgSlug>${subdomain}[^.]+)\\..*`,
          },
        ],
        source: `/:user((?!${pages.join("|")}|_next|public))/:path*`,
        destination: "/:user/:path*",
      },
    ];

    let afterFiles = [
      {
        source: "/org/:slug",
        destination: "/team/:slug",
      },
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
      // Keep cookie based booker enabled just in case we disable new-booker globally
      ...[
        {
          source: userTypeRouteRegExp,
          destination: "/new-booker/:user/:type",
          has: [{ type: "cookie", key: "new-booker-enabled" }],
        },
        {
          source: teamTypeRouteRegExp,
          destination: "/new-booker/team/:slug/:type",
          has: [{ type: "cookie", key: "new-booker-enabled" }],
        },
        {
          source: privateLinkRouteRegExp,
          destination: "/new-booker/d/:link/:slug",
          has: [{ type: "cookie", key: "new-booker-enabled" }],
        },
      ],
      // Keep cookie based booker enabled to test new-booker embed in production
      ...[
        {
          source: embedUserTypeRouteRegExp,
          destination: "/new-booker/:user/:type/embed",
          has: [{ type: "cookie", key: "new-booker-enabled" }],
        },
        {
          source: embedTeamTypeRouteRegExp,
          destination: "/new-booker/team/:slug/:type/embed",
          has: [{ type: "cookie", key: "new-booker-enabled" }],
        },
      ],
      /* TODO: have these files being served from another deployment or CDN {
        source: "/embed/embed.js",
        destination: process.env.NEXT_PUBLIC_EMBED_LIB_URL?,
      }, */

      /**
       * Enables new booker using cookie. It works even if NEW_BOOKER_ENABLED_FOR_NON_EMBED, NEW_BOOKER_ENABLED_FOR_EMBED are disabled
       */
    ];

    // Enable New Booker for all Embed Requests
    if (process.env.NEW_BOOKER_ENABLED_FOR_EMBED === "1") {
      console.log("Enabling New Booker for Embed");
      afterFiles.push(
        ...[
          {
            source: embedUserTypeRouteRegExp,
            destination: "/new-booker/:user/:type/embed",
          },
          {
            source: embedTeamTypeRouteRegExp,
            destination: "/new-booker/team/:slug/:type/embed",
          },
        ]
      );
    }

    // Enable New Booker for All but embed Requests
    if (process.env.NEW_BOOKER_ENABLED_FOR_NON_EMBED === "1") {
      console.log("Enabling New Booker for Non-Embed");
      afterFiles.push(
        ...[
          {
            source: userTypeRouteRegExp,
            destination: "/new-booker/:user/:type",
          },
          {
            source: teamTypeRouteRegExp,
            destination: "/new-booker/team/:slug/:type",
          },
          {
            source: privateLinkRouteRegExp,
            destination: "/new-booker/d/:link/:slug",
          },
        ]
      );
    }
    return {
      beforeFiles,
      afterFiles,
    };
  },
  async headers() {
    return [
      {
        source: "/auth/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
      {
        source: "/signup",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
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
      {
        source: "/settings/admin",
        destination: "/settings/admin/flags",
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
      {
        source: "/support",
        destination: "/event-types?openIntercom=true",
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

module.exports = () => plugins.reduce((acc, next) => next(acc), nextConfig);
