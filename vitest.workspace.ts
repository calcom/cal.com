import { defineWorkspace } from "vitest/config";

const packagedEmbedTestsOnly = process.argv.includes("--packaged-embed-tests-only");
const timeZoneDependentTestsOnly = process.argv.includes("--timeZoneDependentTestsOnly");
const integrationTestsOnly = process.argv.includes("--integrationTestsOnly");
// eslint-disable-next-line turbo/no-undeclared-env-vars
const envTZ = process.env.TZ;
if (timeZoneDependentTestsOnly && !envTZ) {
  throw new Error("TZ environment variable is not set");
}

// defineWorkspace provides a nice type hinting DX
const workspaces = packagedEmbedTestsOnly
  ? [
      {
        test: {
          name: "PackagedEmbedTests",
          include: ["packages/embeds/**/packaged/**/*.{test,spec}.{ts,js}"],
          environment: "jsdom",
        },
      },
    ]
  : integrationTestsOnly
  ? [
      {
        test: {
          name: `IntegrationTests`,
          include: ["packages/**/*.integration-test.ts", "apps/**/*.integration-test.ts"],
          exclude: ["**/node_modules/**/*", "packages/embeds/**/*"],
          setupFiles: ["setupVitest.ts"],
        },
        resolve: {
          alias: {
            "~": new URL("./apps/api/v1", import.meta.url).pathname,
          },
        },
      },
    ]
  : // It doesn't seem to be possible to fake timezone per test, so we rerun the entire suite with different TZ. See https://github.com/vitest-dev/vitest/issues/1575#issuecomment-1439286286
  integrationTestsOnly
  ? [
      {
        test: {
          name: `IntegrationTests`,
          include: ["packages/**/*.integration-test.ts", "apps/**/*.integration-test.ts"],
          // TODO: Ignore the api until tests are fixed
          exclude: ["**/node_modules/**/*", "packages/embeds/**/*"],
          setupFiles: ["setupVitest.ts"],
        },
        resolve: {
          alias: {
            "~": new URL("./apps/api/v1", import.meta.url).pathname,
          },
        },
      },
    ]
  : timeZoneDependentTestsOnly
  ? [
      {
        test: {
          name: `TimezoneDependentTests:${envTZ}`,
          include: ["packages/**/*.timezone.test.ts", "apps/**/*.timezone.test.ts"],
          // TODO: Ignore the api until tests are fixed
          exclude: ["**/node_modules/**/*", "packages/embeds/**/*"],
          setupFiles: ["setupVitest.ts"],
        },
      },
    ]
  : [
      {
        test: {
          include: ["packages/**/*.{test,spec}.{ts,js}", "apps/**/*.{test,spec}.{ts,js}"],
          exclude: [
            "**/node_modules/**/*",
            "**/.next/**/*",
            "packages/embeds/**/*",
            "packages/lib/hooks/**/*",
            "packages/platform/**/*",
            "apps/api/v1/**/*",
            "apps/api/v2/**/*",
          ],
          name: "@calcom/core",
          setupFiles: ["setupVitest.ts"],
        },
      },
      {
        test: {
          include: ["apps/api/v1/**/*.{test,spec}.{ts,js}"],
          exclude: [
            "**/node_modules/**/*",
            "**/.next/**/*",
            "packages/embeds/**/*",
            "packages/lib/hooks/**/*",
            "packages/platform/**/*",
            "apps/api/v2/**/*",
          ],
          name: "@calcom/api",
          setupFiles: ["setupVitest.ts"],
        },
        resolve: {
          alias: {
            "~": new URL("./apps/api/v1", import.meta.url).pathname,
          },
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/features",
          include: ["packages/features/**/*.{test,spec}.tsx"],
          exclude: ["packages/features/form-builder/**/*", "packages/features/bookings/**/*"],
          environment: "jsdom",
          setupFiles: ["setupVitest.ts", "packages/ui/components/test-setup.ts"],
        },
      },

      {
        test: {
          name: "@calcom/closecom",
          include: ["packages/app-store/closecom/**/*.{test,spec}.{ts,js}"],
          environment: "jsdom",
          setupFiles: ["packages/app-store/closecom/test/globals.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/app-store-core",
          include: ["packages/app-store/*.{test,spec}.[jt]s?(x)"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/routing-forms",
          include: ["packages/app-store/routing-forms/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/ui",
          include: ["packages/ui/components/**/*.{test,spec}.[jt]s?(x)"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/features/form-builder",
          include: ["packages/features/form-builder/**/*.{test,spec}.[jt]sx"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/features/bookings",
          include: ["packages/features/bookings/**/*.{test,spec}.[jt]sx"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "@calcom/web/components",
          include: ["apps/web/components/**/*.{test,spec}.[jt]sx"],
          environment: "jsdom",
          setupFiles: ["packages/ui/components/test-setup.ts"],
        },
      },
      {
        test: {
          globals: true,
          name: "EventTypeAppCardInterface components",
          include: ["packages/app-store/_components/**/*.{test,spec}.[jt]s?(x)"],
          environment: "jsdom",
          setupFiles: ["packages/app-store/test-setup.ts"],
        },
      },
      {
        test: {
          name: "@calcom/packages/lib/hooks",
          include: ["packages/lib/hooks/**/*.{test,spec}.{ts,js}"],
          environment: "jsdom",
          setupFiles: [],
        },
      },
      {
        test: {
          globals: true,
          environment: "jsdom",
          name: "@calcom/web/modules/views",
          include: ["apps/web/modules/**/*.{test,spec}.tsx"],
          setupFiles: ["apps/web/modules/test-setup.ts"],
        },
      },

      {
        test: {
          globals: true,
          environment: "jsdom",
          name: "@calcom/embeds",
          include: ["packages/embeds/**/*.{test,spec}.{ts,js}"],
          exclude: ["packages/embeds/**/packaged/**/*.{test,spec}.{ts,js}"],
        },
      },
    ];

export default defineWorkspace(workspaces);
