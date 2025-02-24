import basicSsl from "@vitejs/plugin-basic-ssl";
import EnvironmentPlugin from "vite-plugin-environment";

import viteBaseConfig, { embedCoreEnvVars } from "../vite.config";

const path = require("path");
const { defineConfig } = require("vite");
module.exports = defineConfig((configEnv) => {
  /** @type {import('vite').UserConfig} */
  const config = {
    ...viteBaseConfig,
    base: "/embed/",
    plugins: [
      EnvironmentPlugin({
        EMBED_PUBLIC_EMBED_FINGER_PRINT: embedCoreEnvVars.EMBED_PUBLIC_EMBED_FINGER_PRINT,
        EMBED_PUBLIC_EMBED_VERSION: embedCoreEnvVars.EMBED_PUBLIC_EMBED_VERSION,
        EMBED_PUBLIC_VERCEL_URL: embedCoreEnvVars.EMBED_PUBLIC_VERCEL_URL,
        EMBED_PUBLIC_WEBAPP_URL: embedCoreEnvVars.EMBED_PUBLIC_WEBAPP_URL,
        EMBED_PUBLIC_EMBED_LIB_URL: embedCoreEnvVars.EMBED_PUBLIC_EMBED_LIB_URL,
        NEXT_PUBLIC_IS_E2E: embedCoreEnvVars.NEXT_PUBLIC_IS_E2E,
      }),
      ...(process.argv.includes("--https") ? [basicSsl()] : []),
    ],
    server: {
      // Helps us to test that embed works with these headers
      headers: {
        // TODO: https://github.com/calcom/cal.com/issues/16571
        // "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          preview: path.resolve(__dirname, "preview.html"),
          embed: path.resolve(__dirname, "src/embed.ts"),
        },
        plugins: [
          {
            generateBundle: (code, bundle) => {
              // Note: banner/footer doesn't work because it doesn't enclose the entire library code, some variables are still left out.
              // Ideally IIFE mode should be used to solve this problem but it has 2 known problems
              // 1. It doesn't work with rollupOptions.input.preview(as it is an app and app doesn't support it, only libraries)
              // 2. Having IIFE mode somehow adds the CSS imported in embed, directly to the parent page. It is supposed to be used as a string and then that string is used as CSS in shadow dom
              bundle["embed.js"].code = `!function(){${bundle["embed.js"].code}}()`;
            },
          },
        ],
        output: {
          entryFileNames: "[name].js",
          //FIXME: Can't specify UMD as import because preview is an app which doesn't support `format` and this setting apply to both input
          //format: "umd",
          dir: "../../../apps/web/public/embed",
        },
      },
    },
  };

  if (configEnv.mode === "development") {
    config.build.watch = {
      include: ["src/**"],
    };
  }
  return config;
});
