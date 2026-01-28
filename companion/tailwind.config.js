/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        cal: {
          text: {
            DEFAULT: "#333333",
            dark: "#FFFFFF",
            secondary: "#666666",
            secondaryDark: "#A3A3A3",
            muted: "#8E8E93",
            mutedDark: "#A3A3A3",
            emphasis: "#3C3F44",
          },
          bg: {
            DEFAULT: "#FFFFFF",
            dark: "#000000",
            secondary: "#F8F9FA",
            secondaryDark: "#171717",
            muted: "#F2F2F7",
            mutedDark: "#262626",
            emphasis: "#E5E5EA",
            emphasisDark: "#404040",
          },
          border: {
            DEFAULT: "#E5E5EA",
            dark: "#4D4D4D",
            light: "#C6C6C8",
            subtle: "#D1D5DB",
            subtleDark: "#262626",
          },
          accent: {
            DEFAULT: "#007AFF",
            success: "#34C759",
            warning: "#FF9500",
            error: "#FF3B30",
            destructive: "#800020",
            destructiveDark: "#FF453A",
          },
          brand: {
            DEFAULT: "#292929",
            black: "#000000",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
