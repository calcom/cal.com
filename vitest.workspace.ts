import { defineWorkspace } from "vitest/config";

// defineWorkspace provides a nice type hinting DX
export default defineWorkspace([
  {
    test: {
      include: ["packages/**/*.{test,spec}.{ts,js}", "apps/**/*.{test,spec}.{ts,js}"],
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
