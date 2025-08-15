import { resolve } from "path";
import { defineConfig } from "vite";

// Get calOrigin from environment variable or use default
// eslint-disable-next-line turbo/no-undeclared-env-vars
const defaultCalOrigin = process.env.CAL_ORIGIN || "http://app.cal.local:3000";

export default defineConfig({
  server: {
    port: 5173,
    open: `/test-page.html?calOrigin=${encodeURIComponent(defaultCalOrigin)}`,
    headers: {
      // Disable caching in development
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
  define: {
    // Make calOrigin available as a global constant at build time
    __CAL_ORIGIN__: JSON.stringify(defaultCalOrigin),
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "CalEmbedTroubleshooter",
      fileName: () => "troubleshooter.js",
      formats: ["iife"],
    },
    outDir: "dist",
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "troubleshooter.js",
      },
    },
    minify: false,
  },
});
