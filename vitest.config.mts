import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

process.env.INTEGRATION_TEST_MODE = "true";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Mock generated files that may not exist in CI (must come before general aliases)
      {
        find: "@calcom/web/public/app-store/svg-hashes.json",
        replacement: path.resolve(__dirname, "vitest-mocks/svg-hashes.json"),
      },
      {
        find: /^\.\/tailwind\.generated\.css\?inline$/,
        replacement: path.resolve(__dirname, "vitest-mocks/tailwind.generated.css"),
      },
      // Alias Node.js built-ins for jsdom environment
      { find: "crypto", replacement: "node:crypto" },
      // API v1 path alias
      { find: "~", replacement: path.resolve(__dirname, "apps/api/v1") },
      // apps/web path aliases
      { find: "@lib", replacement: path.resolve(__dirname, "apps/web/lib") },
      { find: "app", replacement: path.resolve(__dirname, "apps/web/app") },
      { find: "@calcom/web", replacement: path.resolve(__dirname, "apps/web") },
      // Platform packages that need to be resolved from source in CI
      {
        find: "@calcom/platform-constants",
        replacement: path.resolve(__dirname, "packages/platform/constants/index.ts"),
      },
      {
        find: "@calcom/embed-react",
        replacement: path.resolve(__dirname, "packages/embeds/embed-react/src/index.ts"),
      },
      {
        find: "@calcom/embed-snippet",
        replacement: path.resolve(__dirname, "packages/embeds/embed-snippet/src/index.ts"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./setupVitest.ts"],
    server: {
      deps: {
        // Allow importing Node.js built-ins in jsdom environment
        inline: [/@calcom\/.*/],
      },
    },
    // Exclude API v2 spec files (Jest) and __checks__ (Playwright)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/api/v2/**/*.spec.ts",
      "__checks__/**/*.spec.ts",
    ],
    coverage: {
      provider: "v8",
    },
    passWithNoTests: true,
    testTimeout: 500000,
  },
});

setEnvVariablesThatAreUsedBeforeSetup();

function setEnvVariablesThatAreUsedBeforeSetup() {
  // We can't set it during tests because it is used as soon as _metadata.ts is imported which happens before tests start running
  process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
  // With same env variable, we can test both non org and org booking scenarios
  process.env.NEXT_PUBLIC_WEBAPP_URL = "http://app.cal.local:3000";
  process.env.CALCOM_SERVICE_ACCOUNT_ENCRYPTION_KEY = "UNIT_TEST_ENCRYPTION_KEY";
  process.env.STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY || "sk_test_dummy_unit_test_key";
}
