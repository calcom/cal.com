import { defineWorkspace } from "vitest/config";

const packagedEmbedTestsOnly = process.argv.includes("--packaged-embed-tests-only");
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
  : [
      {
        test: {
          include: ["packages/**/*.{test,spec}.{ts,js}", "apps/**/*.{test,spec}.{ts,js}"],
          // TODO: Ignore the api until tests are fixed
          exclude: ["apps/api/**/*", "**/node_modules/**/*", "packages/embeds/**/*"],
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
    ];

export default defineWorkspace(workspaces);
