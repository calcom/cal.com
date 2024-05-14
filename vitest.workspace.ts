import { defineWorkspace } from "vitest/config";

const packagedEmbedTestsOnly = process.argv.includes("--packaged-embed-tests-only");
const timeZoneDependentTestsOnly = process.argv.includes("--timeZoneDependentTestsOnly");
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
          include: ["packages/embeds/**/*.{test,spec}.{ts,js}"],
          environment: "jsdom",
        },
      },
    ]
  : // It doesn't seem to be possible to fake timezone per test, so we rerun the entire suite with different TZ. See https://github.com/vitest-dev/vitest/issues/1575#issuecomment-1439286286
  timeZoneDependentTestsOnly
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
          environment: "jsdom",
          setupFiles: ["setupVitest.ts"],
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
          name: "@calcom/ui",
          include: ["packages/ui/components/**/*.{test,spec}.[jt]s?(x)"],
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
    ];

export default defineWorkspace(workspaces);
