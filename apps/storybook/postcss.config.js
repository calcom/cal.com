module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    /**
     * We use this postcss plugin to create custom css classes for
     * any pseudo classes (eg hover, focus) mentioned below.
     * This way you can eg show a hover state in Storybook by adding
     * this classname .sb-pseudo--hover to the item.
     *
     * These styles will only be added in storybook, and will NOT
     * end up in the final css bundle of apps using the components.
     */
    "postcss-pseudo-companion-classes": {
      prefix: "sb-pseudo--",
      // We have to keep a restrictTo list here, because otherwise
      // this library will have issues processing tailwind's \: prefixed classes
      // and start adding dots everywhere, breaking this functionality.
      restrictTo: [":hover", ":focus"],
    },
  },
};
