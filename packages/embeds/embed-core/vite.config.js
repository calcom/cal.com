const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/embed.ts"),
			name: "embed",
			fileName: (format) => `embed.${format}.js`,
		},
	},
});
