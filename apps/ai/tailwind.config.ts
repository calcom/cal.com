import config from "@rubriclab/tailwind-config";
import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const tailwindConfig = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
  presets: [{ ...config, content: ["./src/**/*.{js,ts,jsx,tsx}"] }],
  theme: {
    extend: {
      colors: {
        ...config.theme.colors,
        "cal-gray": "#f2f2f2",
        gray: colors.neutral,
      },
      fontFamily: {
        "cal-sans": ["var(--font-cal-sans)"],
      },
      transitionProperty: {
        rounded: "border-radius",
      },
    },
  },
} satisfies Config;

export default tailwindConfig;
