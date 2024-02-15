//
// This is your Tailwind CSS configuration, where
// you can define global style constants such as
// color palette, fonts and sizes.
//
// Read more at https://tailwindcss.com.
//

const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

module.exports = {
  important: true,
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./templates/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        "4xl": "2rem",
      },
      colors: {
        primary: {
          50: "#F4F4F4",
          200: "#C6C6C6",
          500: "#5B5B5B",
          700: "#141414",
        },
        light: {
          emphasis: "#e5e7eb",
          default: "#E0E0E0",
          subtle: "#F3F4F6",
          muted: "#F9FAFB",
          inverted: "#101010",
          info: "#DEE9FC",
          success: "#E1FBE8",
          attention: "FCEED8",
          error: "#F9E3E2",
        },
      },
      fontSize: {
        smb: ".9375rem",
      },
      fontFamily: {
        sans: ["Matter", ...defaultTheme.fontFamily.sans],
        serif: ["Lusitana", ...defaultTheme.fontFamily.serif],
        mono: ["Noto Sans Mono", ...defaultTheme.fontFamily.mono],
        system: ["Matter", ...defaultTheme.fontFamily.sans],
      },
      screens: {
        xs: "360px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
