export default {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-prefixwrap": ".calcom-atoms",
    "./postcss-plugins/scope-root.js": {},
    cssnano: {
      preset: "default",
    },
  },
};
