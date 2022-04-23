const base = require("@calcom/config/tailwind-preset");

module.exports = {
  ...base,
  content: ["**/*Html.ts"],
  theme: {
    ...base.theme,
    extend: {
      ...base.theme.extend,
      colors: {
        ...base.theme.extend.colors,
        // Set default as black
        brand: "var(--cal-brand-color, black)",
      },
    },
  },
};
