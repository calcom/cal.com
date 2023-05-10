import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// @TODO: Do we want to automate this by checking all dirs for export.ts?
const libraries = [
  {
    entry: path.resolve(__dirname, "./booker/export.ts"),
    fileName: "booker",
  },
];

libraries.forEach(async (lib) => {
  await build({
    build: {
      outDir: `./dist/${lib.fileName}`,
      lib: {
        ...lib,
        formats: ["es", "cjs"],
      },
      emptyOutDir: false,
    },
    resolve: {
      alias: {
        crypto: require.resolve("rollup-plugin-node-builtins"),
      },
    },
  });
});
