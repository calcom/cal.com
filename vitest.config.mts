import path from "node:path";
import process from "node:process";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const env = loadEnv("", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const vitestMode = process.env.VITEST_MODE;
// Support both new VITEST_MODE env var and legacy CLI flags for backwards compatibility
// The CLI flags are passed through but Vitest 4.0 doesn't reject them when using yarn test
const isPackagedEmbedMode =
  vitestMode === "packaged-embed" || process.argv.includes("--packaged-embed-tests-only");
const isIntegrationMode = vitestMode === "integration" || process.argv.includes("--integrationTestsOnly");
const isTimezoneMode = vitestMode === "timezone" || process.argv.includes("--timeZoneDependentTestsOnly");

// Always set INTEGRATION_TEST_MODE to allow server-side imports in jsdom environment
// This is needed because getBookingFields.ts checks for this env var to allow imports
process.env.INTEGRATION_TEST_MODE = "true";

if (isTimezoneMode && !process.env.TZ) {
  throw new Error("TZ environment variable is not set for timezone tests");
}

function getTestInclude() {
  if (isPackagedEmbedMode) {
    return ["packages/embeds/**/packaged/**/*.{test,spec}.{ts,js}"];
  }
  if (isIntegrationMode) {
    return ["packages/**/*.integration-test.ts", "apps/**/*.integration-test.ts"];
  }
  if (isTimezoneMode) {
    return ["packages/**/*.timezone.test.ts", "apps/**/*.timezone.test.ts"];
  }
  // Default: run all test files (Vitest default pattern)
  return ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];
}

function getTestExclude() {
  const baseExclude = [
    "**/node_modules/**",
    "**/dist/**",
    "apps/api/v2/**/*.spec.ts",
    "__checks__/**/*.spec.ts",
  ];
  if (isIntegrationMode || isTimezoneMode) {
    return [...baseExclude, "packages/embeds/**/*"];
  }
  return baseExclude;
}

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
    silent: true,
    environment: "jsdom",
    setupFiles: ["./packages/testing/src/setupVitest.ts"],
    include: getTestInclude(),
    exclude: getTestExclude(),
    pool: "forks",
    server: {
      deps: {
        inline: [/@calcom\/.*/],
      },
    },
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
