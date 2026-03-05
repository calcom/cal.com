import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
