import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",

  platform: "node",
  target: "node20",
  format: ["cjs"],

  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,

  /**
   * This prevents runtime "Cannot find module packages/xxx/src"
   */
  noExternal: [/^@calid\//, /^@calcom\//, /^@onehash\//],

  /**
   * Keep heavy runtime/native deps external
   */
  external: [
    "inngest",
    "@prisma/client",
    "bullmq",
    "ioredis",

    // email rendering stack
    "react",
    "react-dom",
    "next-i18next",
    "jsdom",
    "@react-email/render",
    "@react-email/components",

    "deasync",
  ],

  esbuildOptions(options) {
    options.banner = {
      js: `#!/usr/bin/env node`,
    };
  },
});
