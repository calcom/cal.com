const base = require("@calcom/config/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  content: ["./bookings/**/*.tsx"],
};
