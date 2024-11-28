import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

import viteBaseConfig from "../vite.config";

// https://vitejs.dev/config/
export default defineConfig({
  ...viteBaseConfig,
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Cal",
      fileName: (format) => `Cal.${format}.js`,
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
      output: {
        exports: "named",
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
