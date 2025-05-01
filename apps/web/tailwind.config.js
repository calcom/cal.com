const base = require("@calcom/config/tailwind-preset");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  content: [
    ...base.content,
    "../../packages/app-store/routing-forms/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [...base.plugins, require("tailwindcss-animate")],
};
