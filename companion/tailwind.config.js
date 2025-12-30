/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cal: {
          text: {
            DEFAULT: "#333333",
            secondary: "#666666",
            muted: "#8E8E93",
            emphasis: "#3C3F44",
          },
          bg: {
            DEFAULT: "#FFFFFF",
            secondary: "#F8F9FA",
            muted: "#F2F2F7",
          },
          border: {
            DEFAULT: "#E5E5EA",
            light: "#C6C6C8",
          },
          accent: {
            DEFAULT: "#007AFF",
            success: "#34C759",
            warning: "#FF9500",
            error: "#FF3B30",
            destructive: "#DC2626",
          },
          brand: {
            DEFAULT: "#292929",
            black: "#000000",
          },
        },
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
