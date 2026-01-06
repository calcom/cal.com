/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
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
