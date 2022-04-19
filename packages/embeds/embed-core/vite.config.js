require("dotenv").config({ path: "../../../.env" });

const path = require("path");
const { defineConfig } = require("vite");
const tailwindcss = require("tailwindcss");
module.exports = defineConfig({
  envPrefix: "NEXT_PUBLIC_",
  plugins: [
    (() => {
      const tailwindVirtualModuleId = "virtual:tailwindcss";
      return {
        name: "tailwind",
        resolveId: (id) => {
          if (id === tailwindVirtualModuleId) {
            return tailwindVirtualModuleId;
          }
        },
        load: (id) => {
          if (id === tailwindVirtualModuleId) {
            return `export default ${JSON.stringify(tailwindcss() + Math.random())}`;
          }
        },
      };
    })(),
  ],
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
});
