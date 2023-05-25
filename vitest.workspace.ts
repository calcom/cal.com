import { defineWorkspace } from "vitest/config";

// defineWorkspace provides a nice type hinting DX
export default defineWorkspace([
  {
    test: {
      include: ["packages/**/*.{test,spec}.{ts,js}", "apps/**/*.{test,spec}.{ts,js}"],
      // TODO: Ignore the api until tests are fixed
      exclude: ["apps/api/**/*", "**/node_modules/**/*"],
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
]);
