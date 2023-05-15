import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: [resolve(__dirname, "booker/export.ts")],
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
      fs: resolve("../../node_modules/rollup-plugin-node-builtins"),
      path: resolve("../../node_modules/rollup-plugin-node-builtins"),
      os: resolve("../../node_modules/rollup-plugin-node-builtins"),
    },
  },
});
