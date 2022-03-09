const base = require("@calcom/config/tailwind-preset");
module.exports = {
  ...base,
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./ee/components/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
