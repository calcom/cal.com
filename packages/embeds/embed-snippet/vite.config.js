require("dotenv").config({ path: "../../../.env" });

const path = require("path");
const { defineConfig } = require("vite");

process.env.NEXT_PUBLIC_VERCEL_URL = process.env.VERCEL_URL;

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
