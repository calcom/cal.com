import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // clearMocks: true,
    // cache: false,
    coverage: {
      provider: "v8",
    },
  },
});
