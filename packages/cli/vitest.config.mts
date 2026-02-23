import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,js}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
    testTimeout: 30000,
  },
});
