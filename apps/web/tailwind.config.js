const base = require("@calcom/config/tailwind-preset");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  theme: {
    ...base.theme,
    extend: {
      ...base.theme.extend,
      backgroundImage: {
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
      },
      keyframes: {
        disco: {
          "0%": { transform: "translateY(-50%) rotate(0deg)" },
          "100%": { transform: "translateY(-50%) rotate(360deg)" },
        },
      },
      animation: {
        disco: "disco 8s linear infinite",
      },
    },
  },
  content: [...base.content],
};
