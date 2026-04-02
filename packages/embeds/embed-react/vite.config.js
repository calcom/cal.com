import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteBaseConfig from "../vite.config";

const useClientBanner = '"use client";';
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
      onwarn(warning, defaultHandler) {
        // If "use client" directive has been added to the top of the file, then we can ignore the warnings related to it
        if (useClientBanner) {
          if (
            // vite-plugin-react also ignores this warning - https://github.com/vitejs/vite-plugin-react/blob/3748fc7493cf0a07a2ae275fbd1ae035f01010cc/packages/plugin-react/src/index.ts#L307-L323
            warning.code === "MODULE_LEVEL_DIRECTIVE" &&
            warning.message.includes("use client")
          ) {
            return;
          }
          // It comes due to use client directive being ignored in the middle of the file
          // Even though this could happen in other cases, but there would always be another corresponding error logged which could still highlight any issue during build
          if (warning.message?.includes("Can't resolve original location of error")) {
            return;
          }
        }
        defaultHandler(warning);
      },
      output: {
        exports: "named",
        // Add "use client" directive to the top of the bundle for Next.js App Router compatibility
        // During bundling "use client" directive comes in b/w  the file which is ignored/removed by Rollup because it makes sense at the top only
        banner: useClientBanner,
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
      },
    },
  },
});
