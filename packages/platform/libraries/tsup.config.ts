import { defineConfig } from "tsup";
import path from "node:path";
import type { Plugin, BuildOptions, PluginBuild } from "esbuild";

const __dirname: string = path.dirname(new URL(import.meta.url).pathname);

const relativeAliasPlugin: Plugin = {
  name: "relative-alias",
  setup(build: PluginBuild): void {
    build.onResolve({ filter: /^\.\.?\/server\/i18n$/ }, () => {
      return { path: path.resolve(__dirname, "./i18n.ts") };
    });
  },
};

const reactShimPath: string = path.resolve(__dirname, "./react-shim.js");

const external: string[] = [
  // Node.js built-ins
  "fs",
  "path",
  "os",
  "crypto",
  "http",
  "fs/promises",
  "perf_hooks",
  "querystring",

  // React - external, but we use banner to ensure it's available globally
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react-i18next",

  // Prisma
  "@prisma/client",
  "@prisma/adapter-pg",
  "@prisma/client/runtime/index-browser.js",
  "@prisma/extension-accelerate",
  "pg",

  // Core libraries
  "lodash",
  "zod",
  "dayjs",
  "uuid",
  "short-uuid",
  "axios",
  "qs",
  "qs-stringify",
  "async",

  // dayjs plugins
  "dayjs/plugin/customParseFormat.js",
  "dayjs/plugin/duration.js",
  "dayjs/plugin/isBetween.js",
  "dayjs/plugin/isToday.js",
  "dayjs/plugin/localizedFormat.js",
  "dayjs/plugin/minMax.js",
  "dayjs/plugin/relativeTime.js",
  "dayjs/plugin/timezone.js",
  "dayjs/plugin/toArray.js",
  "dayjs/plugin/utc.js",

  // i18n
  "i18next",
  "next-i18next",
  "next-i18next/serverSideTranslations",

  // Auth
  "next-auth/jwt",
  "jsonwebtoken",

  // Monitoring/Logging
  "@sentry/nextjs",
  "tslog",

  // tRPC
  "@trpc/server",

  // Calendar/Scheduling
  "ical.js",
  "ics",
  "tsdav",
  "@googleapis/calendar",
  "rrule",
  "ews-javascript-api",
  "@ewsjs/xhr",

  // Communication
  "@sendgrid/client",
  "@sendgrid/mail",
  "twilio",
  "nodemailer",

  // CRM
  "@hubspot/api-client",
  "@jsforce/jsforce-node",
  "jsforce",

  // Payments
  "stripe",
  "@getalby/lightning-tools",

  // Other services
  "svix",
  "@tryvital/vital-node",

  // Utilities
  "libphonenumber-js",
  "raw-body",
  "handlebars",
  "lru-cache",
  "memory-cache",
  "queue",
  "entities",
  "sanitize-html",
  "markdown-it",

  // DOM/Browser (has dynamic requires that can't be bundled)
  "jsdom",
];

const entry: Record<string, string> = {
  index: "./index.ts",
  schedules: "./schedules.ts",
  emails: "./emails.ts",
  "event-types": "./event-types.ts",
  "app-store": "./app-store.ts",
  workflows: "./workflows.ts",
  slots: "./slots.ts",
  conferencing: "./conferencing.ts",
  repositories: "./repositories.ts",
  bookings: "./bookings.ts",
  organizations: "./organizations.ts",
  "private-links": "./private-links.ts",
  pbac: "./pbac.ts",
};

const noExternalPackages: string[] = [
  "@calcom/dayjs",
  "@calcom/lib",
  "@calcom/trpc",
  "@calcom/features",
  "@calcom/prisma",
  "@calcom/core",
  "@calcom/emails",
  "@calcom/app-store",
];

const alias: Record<string, string> = {
  "@calcom/lib/server/i18n": path.resolve(__dirname, "./i18n.ts"),
  "@": path.resolve(__dirname, "./src"),
  "@calcom/lib": path.resolve(__dirname, "../../lib"),
  "@calcom/trpc": path.resolve(__dirname, "../../trpc"),
  "@calcom/dayjs": path.resolve(__dirname, "../../dayjs"),
  "@calcom/prisma/client/runtime/library": path.resolve(__dirname, "../../prisma/client/runtime/library"),
  "@calcom/prisma/client": path.resolve(__dirname, "../../prisma/client"),
  "@calcom/platform-constants": path.resolve(__dirname, "../constants/index.ts"),
  "@calcom/platform-types": path.resolve(__dirname, "../types/index.ts"),
  tslog: path.resolve(__dirname, "../../../apps/api/v2/src/lib/logger.bridge.ts"),
};

export default defineConfig([
  {
    entry,
    format: ["esm"],
    dts: true,
    splitting: true,
    sourcemap: false,
    clean: true,
    target: "node18",
    platform: "node",
    external,
    noExternal: noExternalPackages,
    define: {
      "process.env.USE_POOL": '"true"',
    },
    esbuildPlugins: [relativeAliasPlugin],
    esbuildOptions(options: BuildOptions): void {
      options.alias = alias;
      options.conditions = ["node", "import", "require", "default"];
      options.inject = [reactShimPath];
    },
    treeshake: true,
  },
  {
    entry,
    format: ["cjs"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    target: "node18",
    platform: "node",
    external,
    noExternal: noExternalPackages,
    define: {
      "process.env.USE_POOL": '"true"',
    },
    esbuildPlugins: [relativeAliasPlugin],
    esbuildOptions(options: BuildOptions): void {
      options.alias = alias;
      options.conditions = ["node", "import", "require", "default"];
      options.inject = [reactShimPath];
    },
    treeshake: true,
  },
]);
