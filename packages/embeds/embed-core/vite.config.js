require("dotenv").config({ path: "../../../.env" });

const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig((configEnv) => {
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

  if (configEnv.mode === "development") {
    config.build.watch = {
      include: ["src/**"],
    };
  }
  return config;
});
