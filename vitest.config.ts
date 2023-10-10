import { defineConfig } from "vitest/config";

process.env.INTEGRATION_TEST_MODE = "true";

// We can't set it during tests because it is used as soon as _metadata.ts is imported which happens before tests start running
process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
    },
    testTimeout: 500000,
  },
});
