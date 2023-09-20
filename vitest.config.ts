import { defineConfig } from "vitest/config";

process.env.INTEGRATION_TEST_MODE = "true";

export default defineConfig({
  test: {
    // clearMocks: true,
    // cache: false,
    coverage: {
      provider: "v8",
    },
    testTimeout: 500000,
  },
});
