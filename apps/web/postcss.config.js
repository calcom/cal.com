console.log("PostCSS config loaded");

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {
      config: "./tailwind.config.js",
    },
  },
};
