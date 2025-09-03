import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "node18",
    ssr: true,
    lib: {
      entry: {
        index: resolve(__dirname, "./index.ts"),
        calendar: resolve(__dirname, "./calendar.ts"),
        payment: resolve(__dirname, "./payment.ts"),
        video: resolve(__dirname, "./video.ts"),
        crm: resolve(__dirname, "./crm.ts"),
        analytics: resolve(__dirname, "./analytics.ts"),
        browser: resolve(__dirname, "./browser.ts"),
        metadata: resolve(__dirname, "./metadata.ts"),
        utils: resolve(__dirname, "./utils.ts"),
        appStoreMetaData: resolve(__dirname, "./appStoreMetaData.ts"),
      },
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "next",
        "next/dynamic",
        "@calcom/lib",
        "@calcom/types",
        "@calcom/prisma",
        "@calcom/features",
        "@calcom/ui",
        "@calcom/trpc",
        "@prisma/client",
        "lodash",
        "qs-stringify",
        "react-i18next",
        "stripe",
        /^@calcom\/app-store\/.*/,
        "crypto",
        "fs",
        "path",
        "url",
        "querystring",
        "util",
        "stream",
        "buffer",
        "events",
        "http",
        "https",
        "os",
        "zlib",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          next: "Next",
          "next/dynamic": "NextDynamic",
        },
      },
    },
  },
});
