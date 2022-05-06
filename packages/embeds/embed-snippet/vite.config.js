const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  build: {
    envPrefix: "NEXT_PUBLIC_",
    lib: {
      entry: path.resolve(__dirname, "src", "index.ts"),
      name: "snippet",
      fileName: (format) => `snippet.${format}.js`,
    },
    minify: "terser",
    terserOptions: {
      compress: true,
    },
  },
});
