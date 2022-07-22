const base = require("@calcom/config/tailwind-preset");
// const colorGen = require('@calcom/config/ColorPalletGenerator')
module.exports = {
  ...base,
  content: ["../../packages/ui/**/*.{js,ts,jsx,tsx}", "./stories/**/*.{js,ts,tsx,jsx}"],
  // theme: { . ** Figure this out doesnt seem to work in current state
  //   extends: {
  //     color: {
  //       brand: colorGen("#111827"),
  //     },
  //   },
  // },
};
