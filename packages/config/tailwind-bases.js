const plugin = require("tailwindcss/plugin");

module.exports = plugin(function ({ addBase, theme, addComponents, addUtilities }) {
  const h1Base = {
    fontSize: "28px",
    fontWeight: theme("fontWeight.semibold"),
    lineHeight: "28px",
  };

  const h2Base = {
    fontSize: theme("fontSize.2xl"),
    fontWeight: theme("fontWeight.semibold"),
    lineHeight: "24px",
  };

  const h3Base = {
    fontSize: theme("fontSize.xl"),
    fontWeight: theme("fontWeight.semibold"),
    lineHeight: "20px",
  };

  const pBase = {
    fontSize: theme("fontSize.sm"),
    leading: theme("leading.none"),
    fontWeight: theme("fontWeight.normal"),
  };

  const smallBase = {
    fontSize: theme("fontSize.xs"),
    leading: theme("leading.none"),
    fontWeight: theme("fontWeight.normal"),
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

    "p, small": {
      fontFamily: theme("fontFamily.sans"),
      color: theme("colors.black"),
    },

    //** Base heading styles */
    h1: h1Base,
    h2: h2Base,
    h3: h3Base,

    //** Base paragraph & Small styles */
    p: pBase,
    small: smallBase,

    //** Dark mode styles */
    ".dark": {
      "h1, h2, h3, h4,p , small": {
        color: theme("colors.darkgray.900"),
      },
    },
  });

  //** Component heading styles - used if a heading needs to look like another varient*/
  addComponents({
    ".title-1": { ...h1Base },
    ".title-2": { ...h2Base },
    ".title-3": { ...h3Base },
    ".multiline-normal": {
      fontFamily: theme("fontFamily.sans"),
      color: theme("colors.black"),
      fontSize: theme("fontSize.sm"),
      fontWeight: theme("fontWeight.normal"),
      lineHeight: theme("leading.normal"),
    },
    ".multiline-medium": {
      fontFamily: theme("fontFamily.sans"),
      color: theme("colors.black"),
      fontSize: theme("fontSize.sm"),
      fontWeight: theme("fontWeight.medium"),
      lineHeight: "20px",
    },
  });
});
