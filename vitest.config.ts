import { defineConfig } from "vitest/config";

process.env.NEXT_PUBLIC_UNIT_TESTS = 1;
export default defineConfig({
  test: {
    coverage: {
      provider: "c8",
    },
  },
});
