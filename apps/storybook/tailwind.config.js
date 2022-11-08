const base = require("@calcom/config/tailwind-preset");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  darkMode: ["class", '[data-mode="dark"]'],
  content: [...base.content, "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}", "./stories/**/*.{js,ts,tsx,jsx}"],
};
