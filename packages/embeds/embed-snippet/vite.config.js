import viteBaseConfig from "../vite.config";

const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  ...viteBaseConfig,
  build: {
    lib: {
      entry: path.resolve(__dirname, "src", "index.ts"),
      name: "snippet",
      fileName: (format) => `snippet.${format}.js`,
    },
  },
});
