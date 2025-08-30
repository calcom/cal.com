import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // .env inside of packages/platform/atoms
  const webAppUrl = env.NEXT_PUBLIC_WEBAPP_URL ?? "https://app.cal.com";
  return {
    optimizeDeps: {
      include: [
        "@calcom/lib",
        "@calcom/features",
        "@calcom/prisma",
        "@calcom/dayjs",
        "@calcom/platform-constants",
        "@calcom/platform-types",
        "@calcom/platform-utils",
      ],
    },
    plugins: [react(), dts({ insertTypesEntry: true })],
    define: {
      "process.env.NEXT_PUBLIC_WEBAPP_URL": `"${webAppUrl}"`,
    },
    ssr: {
      noExternal: ["turndown"], // Example if you want to disable SSR for your library
    },
    build: {
      lib: {
        entry: [resolve(__dirname, "index.ts")],
        name: "CalAtoms",
        fileName: "cal-atoms",
        formats: ["es"],
      },
      rollupOptions: {
        external: ["react", "fs", "path", "os", "react/jsx-runtime", "react-dom", "react-dom/client"],
        output: {
          format: "esm",
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
        "@calcom/lib/markdownToSafeHTML": path.resolve(__dirname, "./lib/markdownToSafeHTML"),
        "@calcom/lib/hooks/useLocale": path.resolve(__dirname, "./lib/useLocale"),
        "@radix-ui/react-tooltip": path.resolve(__dirname, "./src/components/ui/tooltip.tsx"),
        "@radix-ui/react-dialog": path.resolve(__dirname, "./src/components/ui/dialog.tsx"),
        ".prisma/client": path.resolve(__dirname, "../../prisma-client"),
        "@prisma/client": path.resolve(__dirname, "../../prisma-client"),
        "@calcom/prisma/client": path.resolve(__dirname, "../../prisma-client"),
        "@calcom/prisma": path.resolve(__dirname, "../../prisma"),
        "@calcom/dayjs": path.resolve(__dirname, "../../dayjs"),
        "@calcom/platform-constants": path.resolve(__dirname, "../constants/index.ts"),
        "@calcom/platform-types": path.resolve(__dirname, "../types/index.ts"),
        "@calcom/platform-utils": path.resolve(__dirname, "../constants/index.ts"),
        "@calcom/web/public/static/locales/en/common.json": path.resolve(
          __dirname,
          "../../../apps/web/public/static/locales/en/common.json"
        ),
      },
    },
  };
});
