const base = require("@calcom/config/tailwind-preset");

module.exports = {
  ...base,
  content: [...base.content, "/**/*.{js,ts,jsx,tsx}"],
};
