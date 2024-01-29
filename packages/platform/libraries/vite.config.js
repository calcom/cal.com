// vite.config.ts
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: resolve(__dirname, "./index.ts"),
      name: "calcom-lib",
      fileName: "calcom-lib",
    },
    commonjsOptions: {
      dynamicRequireRoot: "../../../apps/web",
      dynamicRequireTargets: ["next-i18next.config.js"],
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      external: ["react", "fs", "path", "os", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  plugins: [react(), dts()],
  resolve: {
    alias: {
      fs: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      path: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      os: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      "@": path.resolve(__dirname, "./src"),
      "@calcom/lib": path.resolve(__dirname, "../../lib"),
      ".prisma/client/index-browser": "../../../apps/api/v2/node_modules/prisma/prisma-client/index.js",
    },
  },
});
