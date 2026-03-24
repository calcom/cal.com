import react from "@vitejs/plugin-react";
import replace from "@rollup/plugin-replace";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }),
    replace({
      preventAssignment: true,
      "import.meta.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID": JSON.stringify(
        process.env.VITE_BOOKER_EMBED_OAUTH_CLIENT_ID ?? ""
      ),
      "import.meta.env.VITE_BOOKER_EMBED_API_URL": JSON.stringify(
        process.env.VITE_BOOKER_EMBED_API_URL ?? ""
      ),
    }),
  ],
  build: {
    minify: false,  // <-- critical: preserves forwardRef fn.length
    lib: {
      entry: resolve(__dirname, "index.ts"),
      name: "BookerEmbed",
      formats: ["es"],
      fileName: "booker-embed",
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],  // atoms is NOT external
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});