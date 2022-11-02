module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "postcss-pseudo-companion-classes": {
      prefix: "sb-pseudo--",
      // We have to keep a restrictTo list here, because otherwise
      // this library will have issues processing tailwind's \: prefixed classes
      // and start adding dots everywhere, breaking this functionality.
      restrictTo: [":hover", ":focus"],
    },
  },
};
