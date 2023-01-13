const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addBase, theme, addComponents }) {
  const h1Base = {
    fontSize: "28px",
    fontWeight: theme("fontWeight.semibold"),
  };

  const h2Base = {
    fontSize: theme("fontSize.2xl"),
    fontWeight: theme("fontWeight.semibold"),
  };

  const h3Base = {
    fontSize: theme("fontSize.xl"),
    fontWeight: theme("fontWeight.semibold"),
  };

  /** Base heading styles
   * - used for all headings
   * - h1,h2,h3 are commonly used
   * - h4 is used in very few occurances and is not included in the base styles
   */

  addBase({
    "h1, h2, h3, h4": {
      fontFamily: theme("fontFamily.cal"),
      color: theme("colors.black"),
    },

    //** Base heading styles */
    h1: h1Base,
    h2: h2Base,
    h3: h3Base,

    ".dark": {
      "h1, h2, h3, h4": {
        color: theme("colors.darkgray.900"),
      },
    },
  });

  //** Component heading styles - used if a heading needs to look like another varient*/
  addComponents({
    ".title-1": h1Base,
    ".title-2": h2Base,
    ".title-3": h3Base,
  });
});
