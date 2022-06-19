const base = require("@calcom/config/tailwind-preset");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  content: [
    ...base.content,
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
    "../../packages/app-store/**/{components,pages}/**/*.{js,ts,jsx,tsx}",
  ],
};
