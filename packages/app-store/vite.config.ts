import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: {
        appStoreMetaData: resolve(__dirname, "./appStoreMetaData.ts"),
      },
      formats: ["cjs", "es"],
      fileName: (format, entryName) => {
        const extension = format === "cjs" ? "cjs" : "js";
        return `${entryName}.${extension}`;
      },
    },
    rollupOptions: {
      external: ["@calcom/types/App", "@calcom/lib"],
    },
  },
});
