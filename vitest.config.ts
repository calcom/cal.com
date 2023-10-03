import { defineConfig } from "vitest/config";

process.env.INTEGRATION_TEST_MODE = "true";
process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    testTimeout: 500000,
  },
});
