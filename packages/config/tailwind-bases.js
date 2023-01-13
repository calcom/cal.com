const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addBase, theme }) {
  addBase({
    h1: {
      fontFamily: theme("fontFamily.cal"),
      fontSize: "28px",
      fontWeight: theme("fontWeight.semibold"),
      color: theme("colors.black"),
    },
    h2: {
      fontFamily: theme("fontFamily.cal"),
      fontSize: theme("fontSize.2xl"),
      fontWeight: theme("fontWeight.semibold"),
      color: theme("colors.black"),
    },
    h3: {
      fontFamily: theme("fontFamily.cal"),
      fontSize: theme("fontSize.xl"),
      fontWeight: theme("fontWeight.semibold"),
      color: theme("colors.black"),
    },
    ".dark": {
      "h1, h2, h3": {
        color: theme("colors.darkgray.900"),
      },
    },
  });
});
