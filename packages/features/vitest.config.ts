import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "features-tests", // Unique name for this test suite
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@calcom/features": resolve(__dirname, "./"),
    },
  },
});
