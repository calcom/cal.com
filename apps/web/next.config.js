/* eslint-disable */
require("dotenv").config({ path: "../../.env" });
const englishTranslation = require("./public/static/locales/en/common.json");
const { withAxiom } = require("next-axiom");
const { withBotId } = require("botid/next/config");
const { version } = require("./package.json");
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
const {
  i18n: { locales },
} = require("./next-i18next.config");
const {
  nextJsOrgRewriteConfig,
  orgUserRoutePath,
  orgUserTypeRoutePath,
  orgUserTypeEmbedRoutePath,
} = require("./pagesAndRewritePaths");

adjustEnvVariables();

if (!process.env.NEXTAUTH_SECRET) throw new Error("Please set NEXTAUTH_SECRET");
if (!process.env.CALENDSO_ENCRYPTION_KEY) throw new Error("Please set CALENDSO_ENCRYPTION_KEY");
const isOrganizationsEnabled =
  process.env.ORGANIZATIONS_ENABLED === "1" || process.env.ORGANIZATIONS_ENABLED === "true";
// To be able to use the version in the app without having to import package.json
process.env.NEXT_PUBLIC_CALCOM_VERSION = version;

// So we can test deploy previews preview
if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_WEBAPP_URL) {
  process.env.NEXT_PUBLIC_WEBAPP_URL = `https://${process.env.VERCEL_URL}`;
}
// Check for configuration of NEXTAUTH_URL before overriding
if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_WEBAPP_URL) {
  process.env.NEXTAUTH_URL = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/auth`;
}
if (!process.env.NEXT_PUBLIC_WEBSITE_URL) {
  process.env.NEXT_PUBLIC_WEBSITE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
}
if (
  process.env.CSP_POLICY === "strict" &&
  (process.env.CALCOM_ENV === "production" || process.env.NODE_ENV === "production")
) {
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

const getHttpsUrl = (url) => {
  if (!url) return url;
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
};

if (process.argv.includes("--experimental-https")) {
  process.env.NEXT_PUBLIC_WEBAPP_URL = getHttpsUrl(process.env.NEXT_PUBLIC_WEBAPP_URL);
  process.env.NEXTAUTH_URL = getHttpsUrl(process.env.NEXTAUTH_URL);
  process.env.NEXT_PUBLIC_EMBED_LIB_URL = getHttpsUrl(process.env.NEXT_PUBLIC_EMBED_LIB_URL);
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

const informAboutDuplicateTranslations = () => {
  const valueMap = {};

  for (const key in englishTranslation) {
    const value = englishTranslation[key];

    if (valueMap[value]) {
      console.warn(
        "\x1b[33mDuplicate value found in common.json keys:",
        "\x1b[0m ",
        key,
        "and",
        valueMap[value]
      );
    } else {
      valueMap[value] = key;
    }
  }
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

if (process.env.NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER === "1") {
  plugins.push(withBotId);
}

const orgDomainMatcherConfig = {
  root: nextJsOrgRewriteConfig.disableRootPathRewrite
    ? null
    : {
        has: [
          {
            type: "host",
            value: nextJsOrgRewriteConfig.orgHostPath,
          },
        ],
        source: "/",
      },

  rootEmbed: nextJsOrgRewriteConfig.disableRootEmbedPathRewrite
    ? null
    : {
        has: [
          {
            type: "host",
            value: nextJsOrgRewriteConfig.orgHostPath,
          },
        ],
        source: "/embed",
      },

  user: {
    has: [
      {
        type: "host",
        value: nextJsOrgRewriteConfig.orgHostPath,
      },
    ],
    source: orgUserRoutePath,
  },

  userType: {
    has: [
      {
        type: "host",
        value: nextJsOrgRewriteConfig.orgHostPath,
      },
    ],
    source: orgUserTypeRoutePath,
  },

  userTypeEmbed: {
    has: [
      {
        type: "host",
        value: nextJsOrgRewriteConfig.orgHostPath,
      },
    ],
    source: orgUserTypeEmbedRoutePath,
  },
};

/** @type {import("next").NextConfig} */
const nextConfig = (phase) => {
  if (isOrganizationsEnabled) {
    // We want to log the phase here because it is important that the rewrite is added during the build phase(phase=phase-production-build)
    console.log(
      `[Phase: ${phase}] Adding rewrite config for organizations - orgHostPath: ${nextJsOrgRewriteConfig.orgHostPath}, orgSlug: ${nextJsOrgRewriteConfig.orgSlug}, disableRootPathRewrite: ${nextJsOrgRewriteConfig.disableRootPathRewrite}`
    );
  } else {
    console.log(
      `[Phase: ${phase}] Skipping rewrite config for organizations because ORGANIZATIONS_ENABLED is not set`
    );
  }
  return {
    output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
    serverExternalPackages: [
      "deasync",
      "http-cookie-agent", // Dependencies of @ewsjs/xhr
      "rest-facade",
      "superagent-proxy", // Dependencies of @tryvital/vital-node
      "superagent", // Dependencies of akismet
      "formidable", // Dependencies of akismet
      "@boxyhq/saml-jackson",
      "jose", // Dependency of @boxyhq/saml-jackson
    ],
    experimental: {
      // externalize server-side node_modules with size > 1mb, to improve dev mode performance/RAM usage
      optimizePackageImports: ["@calcom/ui"],
      webpackMemoryOptimizations: true,
      webpackBuildWorker: true,
    },
    productionBrowserSourceMaps: true,
    transpilePackages: [
      "@calcom/app-store",
      "@calcom/dayjs",
      "@calcom/emails",
      "@calcom/embed-core",
      "@calcom/features",
      "@calcom/lib",
      "@calcom/prisma",
      "@calcom/trpc",
      "@coss/ui",
    ],
    modularizeImports: {
      "@calcom/features/insights/components": {
        transform: "@calcom/features/insights/components/{{member}}",
        skipDefaultConversion: true,
        preventFullImport: true,
      },
      lodash: {
        transform: "lodash/{{member}}",
      },
    },
    images: {
      unoptimized: true,
    },
    webpack: (config, { webpack, buildId, isServer, dev }) => {
      if (!dev) {
        if (config.cache) {
          config.cache = Object.freeze({
            type: "memory",
          });
        }
      }

      if (isServer) {
        // Module not found fix @see https://github.com/boxyhq/jackson/issues/1535#issuecomment-1704381612
        config.plugins.push(
          new webpack.IgnorePlugin({
            resourceRegExp:
              /(^@google-cloud\/spanner|^@mongodb-js\/zstd|^@sap\/hana-client\/extension\/Stream$|^@sap\/hana-client|^@sap\/hana-client$|^aws-crt|^aws4$|^better-sqlite3$|^bson-ext$|^cardinal$|^cloudflare:sockets$|^hdb-pool$|^ioredis$|^kerberos$|^mongodb-client-encryption$|^mysql$|^oracledb$|^pg-native$|^pg-query-stream$|^react-native-sqlite-storage$|^snappy\/package\.json$|^snappy$|^sql.js$|^sqlite3$|^typeorm-aurora-data-api-driver$)/,
          })
        );

        config.plugins = [...config.plugins, new PrismaPlugin()];

        config.externals.push("formidable");
      }

      config.plugins.push(new webpack.DefinePlugin({ "process.env.BUILD_ID": JSON.stringify(buildId) }));

      config.resolve.fallback = {
        ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
        // by next.js will be dropped. Doesn't make much sense, but how it is
        fs: false,
        // ignore module resolve errors caused by the server component bundler
        "pg-native": false,
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
      const { orgSlug } = nextJsOrgRewriteConfig;
      const beforeFiles = [
        {
          // This should be the first item in `beforeFiles` to take precedence over other rewrites
          source: `/(${locales.join("|")})/:path*`,
          destination: "/:path*",
        },
        {
          source: "/forms/:formQuery*",
          destination: "/apps/routing-forms/routing-link/:formQuery*",
        },
        {
          source: "/routing",
          destination: "/routing/forms",
        },
        {
          source: "/routing/:path*",
          destination: "/apps/routing-forms/:path*",
        },
        {
          source: "/routing-forms",
          destination: "/apps/routing-forms/forms",
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
        {
          /**
           * Needed due to the introduction of dotted usernames
           * @see https://github.com/calcom/cal.com/pull/11706
           */
          source: "/embed.js",
          destination: "/embed/embed.js",
        },
        {
          source: "/login",
          destination: "/auth/login",
        },
        // These rewrites are other than booking pages rewrites and so that they aren't redirected to org pages ensure that they happen in beforeFiles
        ...(isOrganizationsEnabled
          ? [
              orgDomainMatcherConfig.root
                ? {
                    ...orgDomainMatcherConfig.root,
                    destination: `/team/${orgSlug}?isOrgProfile=1`,
                  }
                : null,
              orgDomainMatcherConfig.rootEmbed
                ? {
                    ...orgDomainMatcherConfig.rootEmbed,
                    destination: `/team/${orgSlug}/embed?isOrgProfile=1`,
                  }
                : null,
              {
                ...orgDomainMatcherConfig.user,
                destination: `/org/${orgSlug}/:user`,
              },
              {
                ...orgDomainMatcherConfig.userType,
                destination: `/org/${orgSlug}/:user/:type`,
              },
              {
                ...orgDomainMatcherConfig.userTypeEmbed,
                destination: `/org/${orgSlug}/:user/:type/embed`,
              },
            ]
          : []),
      ].filter(Boolean);

      let afterFiles = [
        {
          source: "/org/:slug",
          destination: "/team/:slug",
        },
        {
          source: "/org/:orgSlug/avatar.png",
          destination: "/api/user/avatar?orgSlug=:orgSlug",
        },
        {
          source: "/team/:teamname/avatar.png",
          destination: "/api/user/avatar?teamname=:teamname",
        },
        {
          source: "/icons/sprite.svg",
          destination: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/icons/sprite.svg`,
        },
        // for @dub/analytics, @see: https://d.to/reverse-proxy
        {
          source: "/_proxy/dub/track/:path",
          destination: "https://api.dub.co/track/:path",
        },

        // When updating this also update pagesAndRewritePaths.js
        ...[
          {
            source: "/:user/avatar.png",
            destination: "/api/user/avatar?username=:user",
          },
        ],

        /* TODO: have these files being served from another deployment or CDN {
        source: "/embed/embed.js",
        destination: process.env.NEXT_PUBLIC_EMBED_LIB_URL?,
      }, */
      ];

      if (process.env.NEXT_PUBLIC_API_V2_URL) {
        afterFiles.push({
          source: "/api/v2/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_V2_URL}/:path*`,
        });
      }

      return {
        beforeFiles,
        afterFiles,
      };
    },
    async headers() {
      const { orgSlug } = nextJsOrgRewriteConfig;
      // This header can be set safely as it ensures the browser will load the resources even when COEP is set.
      // But this header must be set only on those resources that are safe to be loaded in a cross-origin context e.g. all embeddable pages's resources
      const CORP_CROSS_ORIGIN_HEADER = {
        key: "Cross-Origin-Resource-Policy",
        value: "cross-origin",
      };

      const ACCESS_CONTROL_ALLOW_ORIGIN_HEADER = {
        key: "Access-Control-Allow-Origin",
        value: "*",
      };

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
        {
          source: "/embed/embed.js",
          headers: [CORP_CROSS_ORIGIN_HEADER],
        },
        {
          source: "/:path*/embed",
          // COEP require-corp header is set conditionally when flag.coep is set to true
          headers: [CORP_CROSS_ORIGIN_HEADER],
        },
        {
          source: "/:path*",
          has: [
            {
              type: "host",
              value: "cal.com",
            },
          ],
          headers: [
            // make sure to pass full referer URL for booking pages
            {
              key: "Referrer-Policy",
              value: "no-referrer-when-downgrade",
            },
          ],
        },
        // These resources loads through embed as well, so they need to have CORP_CROSS_ORIGIN_HEADER
        ...[
          {
            source: "/api/avatar/:path*",
            headers: [CORP_CROSS_ORIGIN_HEADER],
          },
          {
            source: "/avatar.svg",
            headers: [CORP_CROSS_ORIGIN_HEADER],
          },
          {
            source: "/icons/sprite.svg(\\?v=[0-9a-zA-Z\\-\\.]+)?",
            headers: [
              CORP_CROSS_ORIGIN_HEADER,
              ACCESS_CONTROL_ALLOW_ORIGIN_HEADER,
              {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
              },
            ],
          },
        ],
        ...(isOrganizationsEnabled
          ? [
              orgDomainMatcherConfig.root
                ? {
                    ...orgDomainMatcherConfig.root,
                    headers: [
                      {
                        key: "X-Cal-Org-path",
                        value: `/team/${orgSlug}`,
                      },
                    ],
                  }
                : null,
              {
                ...orgDomainMatcherConfig.user,
                headers: [
                  {
                    key: "X-Cal-Org-path",
                    value: `/org/${orgSlug}/:user`,
                  },
                ],
              },
              {
                ...orgDomainMatcherConfig.userType,
                headers: [
                  {
                    key: "X-Cal-Org-path",
                    value: `/org/${orgSlug}/:user/:type`,
                  },
                ],
              },
              {
                ...orgDomainMatcherConfig.userTypeEmbed,
                headers: [
                  {
                    key: "X-Cal-Org-path",
                    value: `/org/${orgSlug}/:user/:type/embed`,
                  },
                ],
              },
            ]
          : []),
      ].filter(Boolean);
    },
    async redirects() {
      const redirects = [
        {
          source: "/settings/organizations",
          destination: "/settings/organizations/profile",
          permanent: false,
        },
        {
          source: "/apps/routing-forms",
          destination: "/apps/routing-forms/forms",
          permanent: false,
        },
        {
          source: "/api/app-store/:path*",
          destination: "/app-store/:path*",
          permanent: true,
        },
        {
          source: "/auth/new",
          destination: process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com",
          permanent: true,
        },
        {
          source: "/auth/signup",
          destination: "/signup",
          permanent: true,
        },
        {
          source: "/auth",
          destination: "/auth/login",
          permanent: false,
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
          missing: [
            {
              type: "header",
              key: "host",
              value: nextJsOrgRewriteConfig.orgHostPath,
            },
          ],
          destination: "/event-types?openSupport=true",
          permanent: true,
        },
        {
          source: "/apps/categories/video",
          destination: "/apps/categories/conferencing",
          permanent: true,
        },
        {
          source: "/apps/installed/video",
          destination: "/apps/installed/conferencing",
          permanent: true,
        },
        {
          source: "/apps/installed",
          destination: "/apps/installed/calendar",
          permanent: true,
        },
        {
          source: "/settings/organizations/platform/:path*",
          destination: "/settings/platform",
          permanent: true,
        },
        {
          source: "/settings/admin/apps",
          destination: "/settings/admin/apps/calendar",
          permanent: true,
        },
        // OAuth callbacks when sent to localhost:3000(w would be expected) should be redirected to corresponding to WEBAPP_URL
        ...(process.env.NODE_ENV === "development" &&
        // Safer to enable the redirect only when the user is opting to test out organizations
        isOrganizationsEnabled &&
        // Prevent infinite redirect by checking that we aren't already on localhost
        process.env.NEXT_PUBLIC_WEBAPP_URL !== "http://localhost:3000"
          ? [
              {
                has: [
                  {
                    type: "header",
                    key: "host",
                    value: "localhost:3000",
                  },
                ],
                source: "/api/integrations/:args*",
                destination: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/:args*`,
                permanent: false,
              },
            ]
          : []),
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
};

function adjustEnvVariables() {
  if (process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG) {
    if (process.env.RESERVED_SUBDOMAINS) {
      // It is better to ignore it completely so that accidentally if the org slug is itself in Reserved Subdomain that doesn't cause the booking pages to start giving 404s
      console.warn(
        `⚠️  WARNING: RESERVED_SUBDOMAINS is ignored when SINGLE_ORG_SLUG is set. Single org mode doesn't need to use reserved subdomain validation.`
      );
      delete process.env.RESERVED_SUBDOMAINS;
    }

    if (!process.env.ORGANIZATIONS_ENABLED) {
      // This is basically a consent to add rewrites related to organizations. So, if single org slug mode is there, we have the consent already.
      console.log("Auto-enabling ORGANIZATIONS_ENABLED because SINGLE_ORG_SLUG is set");
      process.env.ORGANIZATIONS_ENABLED = "1";
    }
  }
}

module.exports = (phase) => plugins.reduce((acc, next) => next(acc), nextConfig(phase));
