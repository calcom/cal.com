require("dotenv").config({ path: "../../../.env" });

const path = require("path");
const { defineConfig } = require("vite");
const config = {
  envPrefix: "NEXT_PUBLIC_",
  build: {
    minify: "terser",
    terserOptions: {
      format: {
        comments: false,
      },
    },
    lib: {
      entry: path.resolve(__dirname, "src/embed.ts"),
      name: "embed",
      fileName: (format) => `embed.${format}.js`,
    },
  },
};
if (process.env.NODE_ENV !== "production") {
  config.build.watch = {
    include: ["src/**"],
  };
}

module.exports = defineConfig(config);
