const base = require("@calcom/config/tailwind-preset");
/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  theme: {
    extend: {
      // Add your custom classes here
      typography: {
        'text-emphasis': {
          css: {
            // Define the styles for your custom class here
            // For example:
            fontWeight: 'bold',
            color: '#ff0000', // Specify your desired color
          },
        },
      },
    },
  },
  content: [...base.content, "../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}"],
  plugins: [...base.plugins, require("tailwindcss-animate")],
};
