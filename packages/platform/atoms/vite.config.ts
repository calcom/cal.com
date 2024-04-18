import react from "@vitejs/plugin-react";
import path from "path";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  optimizeDeps: {
    include: [
      "@calcom/lib",
      "@calcom/features",
      "@calcom/prisma",
      "@calcom/dayjs",
      "@calcom/platform-constants",
      "@calcom/platform-types",
      "@calcom/platform-libraries",
      "@calcom/platform-utils",
    ],
  },
  plugins: [react(), dts({ insertTypesEntry: true })],
  build: {
    commonjsOptions: {
      include: [/@calcom\/lib/, /@calcom\/features/, /node_modules/],
    },
    lib: {
      entry: [resolve(__dirname, "index.ts")],
      name: "CalAtoms",
      fileName: "cal-atoms",
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
  resolve: {
    alias: {
      fs: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      path: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      os: resolve("../../../node_modules/rollup-plugin-node-builtins"),
      "@": path.resolve(__dirname, "./src"),

      "@calcom/prisma": path.resolve(__dirname, "../../prisma"),
      "@calcom/dayjs": path.resolve(__dirname, "../../dayjs"),
      "@calcom/platform-constants": path.resolve(__dirname, "../constants/index.ts"),
      "@calcom/platform-types": path.resolve(__dirname, "../types/index.ts"),
      "@calcom/platform-libraries": path.resolve(__dirname, "../libraries/index.ts"),
      "@calcom/platform-utils": path.resolve(__dirname, "../constants/index.ts"),
      "@calcom/web/public/static/locales/en/common.json": path.resolve(
        __dirname,
        "../../../apps/web/public/static/locales/en/common.json"
      ),
    },
  },
});
