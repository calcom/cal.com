import base from "@calcom/config/tailwind-preset";

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  content: [...base.content],
  plugins: [...base.plugins, require("tailwindcss-animate")],
};
