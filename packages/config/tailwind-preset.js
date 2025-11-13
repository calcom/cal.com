const plugin = require("tailwindcss/plugin");
const { fontFamily } = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
const subtleColor = "#E5E7EB";
module.exports = {
  content: [
    "../../apps/web/pages/**/*.{js,ts,jsx,tsx}",
    "../../apps/web/app/**/*.{js,ts,jsx,tsx}",
    "../../apps/web/modules/**/*.{js,ts,jsx,tsx}",
    "../../apps/web/components/**/*.{js,ts,jsx,tsx}",
    "../../packages/app-store/!(node_modules)/**/*{components,pages}/**/*.{js,ts,jsx,tsx}",
    "../../packages/features/!(node_modules)/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/!(node_modules)/**/*.{js,ts,jsx,tsx}",
    "../../packages/platform/atoms/!(node_modules)/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    spacing: {
      0: "var(--cal-spacing-0)",
      px: "var(--cal-spacing-px)",
      0.5: "var(--cal-spacing-0_5)",
      1: "var(--cal-spacing-1)",
      1.5: "var(--cal-spacing-1_5)",
      2: "var(--cal-spacing-2)",
      2.5: "var(--cal-spacing-2_5)",
      3: "var(--cal-spacing-3)",
      3.5: "var(--cal-spacing-3_5)",
      4: "var(--cal-spacing-4)",
      5: "var(--cal-spacing-5)",
      6: "var(--cal-spacing-6)",
      7: "var(--cal-spacing-7)",
      8: "var(--cal-spacing-8)",
      9: "var(--cal-spacing-9)",
      10: "var(--cal-spacing-10)",
      11: "var(--cal-spacing-11)",
      12: "var(--cal-spacing-12)",
      14: "var(--cal-spacing-14)",
      16: "var(--cal-spacing-16)",
      20: "var(--cal-spacing-20)",
      24: "var(--cal-spacing-24)",
      28: "var(--cal-spacing-28)",
      32: "var(--cal-spacing-32)",
      36: "var(--cal-spacing-36)",
      40: "var(--cal-spacing-40)",
      44: "var(--cal-spacing-44)",
      48: "var(--cal-spacing-48)",
      52: "var(--cal-spacing-52)",
      56: "var(--cal-spacing-56)",
      60: "var(--cal-spacing-60)",
      64: "var(--cal-spacing-64)",
      72: "var(--cal-spacing-72)",
      80: "var(--cal-spacing-80)",
      96: "var(--cal-spacing-96)",
    },
    borderRadius: {
      none: "var(--cal-radius-none)",
      sm: "var(--cal-radius-sm)",
      DEFAULT: "var(--cal-radius)",
      md: "var(--cal-radius-md)",
      lg: "var(--cal-radius-lg)",
      xl: "var(--cal-radius-xl)",
      "2xl": "var(--cal-radius-2xl)",
      "3xl": "var(--cal-radius-3xl)",
      full: "var(--cal-radius-full)",
    },
    extend: {
      colors: {
        // Standard Background
        emphasis: "var(--cal-bg-emphasis)",
        default: "var(--cal-bg, white)",
        subtle: "var(--cal-bg-subtle)",
        muted: "var(--cal-bg-muted)",
        inverted: "var(--cal-bg-inverted)",

        // Primary Background
        primary: {
          default: "var(--cal-bg-primary)",
          emphasis: "var(--cal-bg-primary-emphasis)",
          muted: "var(--cal-bg-primary-muted)",
        },

        // Brand
        brand: {
          default: "var(--cal-brand,#111827)",
          emphasis: "var(--cal-brand-emphasis,#101010)",
          subtle: "var(--cal-brand-subtle,#9CA3AF)",
          accent: "var(--cal-brand-accent,white)",
        },

        // Semantic Background
        semantic: {
          info: {
            subtle: "var(--cal-bg-semantic-info-subtle)",
            emphasis: "var(--cal-bg-semantic-info-emphasis)",
          },
          success: {
            subtle: "var(--cal-bg-semantic-success-subtle)",
            emphasis: "var(--cal-bg-semantic-success-emphasis)",
          },
          attention: {
            subtle: "var(--cal-bg-semantic-attention-subtle)",
            emphasis: "var(--cal-bg-semantic-attention-emphasis)",
          },
          error: {
            subtle: "var(--cal-bg-semantic-error-subtle)",
            emphasis: "var(--cal-bg-semantic-error-emphasis)",
          },
        },

        // Visualization Background
        visualization: {
          1: {
            subtle: "var(--cal-bg-visualization-1-subtle)",
            emphasis: "var(--cal-bg-visualization-1-emphasis)",
          },
          2: {
            subtle: "var(--cal-bg-visualization-2-subtle)",
            emphasis: "var(--cal-bg-visualization-2-emphasis)",
          },
          3: {
            subtle: "var(--cal-bg-visualization-3-subtle)",
            emphasis: "var(--cal-bg-visualization-3-emphasis)",
          },
          4: {
            subtle: "var(--cal-bg-visualization-4-subtle)",
            emphasis: "var(--cal-bg-visualization-4-emphasis)",
          },
          5: {
            subtle: "var(--cal-bg-visualization-5-subtle)",
            emphasis: "var(--cal-bg-visualization-5-emphasis)",
          },
          6: {
            subtle: "var(--cal-bg-visualization-6-subtle)",
            emphasis: "var(--cal-bg-visualization-6-emphasis)",
          },
          7: {
            subtle: "var(--cal-bg-visualization-7-subtle)",
            emphasis: "var(--cal-bg-visualization-7-emphasis)",
          },
        },

        // Legacy - Consider deprecating
        info: "var(--cal-bg-info)",
        success: "var(--cal-bg-success)",
        attention: "var(--cal-bg-attention)",
        error: "var(--cal-bg-error)",
        darkerror: "var(--cal-bg-dark-error)",

        // Launch colors
        "launch-dark": "var(--cal-bg-launch-dark)",

        // Base colors
        black: "#111111",
        gray: colors.gray,
        darkgray: colors.slate,
      },
      borderColor: {
        // Standard Borders
        emphasis: "var(--cal-border-emphasis)",
        default: "var(--cal-border)",
        subtle: "var(--cal-border-subtle)",
        muted: "var(--cal-border-muted)",

        // Semantic Borders
        semantic: {
          error: "var(--cal-border-semantic-error)",
          "attention-subtle": "var(--cal-border-semantic-attention-subtle)",
          "error-subtle": "var(--cal-border-semantic-error-subtle)",
        },

        // Used in booker embed customization
        booker: `var(--cal-border-booker, ${subtleColor})`,
        // Legacy - Consider deprecating
        error: "var(--cal-border-error)",
        "cal-bg": "var(--cal-bg)",
        "cal-bg-muted": "var(--cal-bg-muted)",
      },
      textColor: {
        // Standard Text
        emphasis: "var(--cal-text-emphasis)",
        default: "var(--cal-text)",
        subtle: "var(--cal-text-subtle)",
        muted: "var(--cal-text-muted)",
        inverted: "var(--cal-text-inverted)",

        // Semantic Text
        semantic: {
          info: "var(--cal-text-semantic-info)",
          success: "var(--cal-text-semantic-success)",
          attention: "var(--cal-text-semantic-attention)",
          error: "var(--cal-text-semantic-error)",
        },

        // Semantic Text Emphasis
        "semantic-info-emphasis": "var(--cal-text-semantic-info-emphasis)",
        "semantic-success-emphasis": "var(--cal-text-semantic-success-emphasis)",
        "semantic-attention-emphasis": "var(--cal-text-semantic-attention-emphasis)",
        "semantic-error-emphasis": "var(--cal-text-semantic-error-emphasis)",

        // Legacy - Consider deprecating
        info: "var(--cal-text-info)",
        success: "var(--cal-text-success)",
        attention: "var(--cal-text-attention)",
        error: "var(--cal-text-error)",
        brand: "var(--cal-brand-text)",
      },
      fill: {
        emphasis: "var(--cal-text-emphasis, #111827)",
        default: "var(--cal-text, #374151)",
        subtle: "var(--cal-text-subtle, #6B7280)",
        muted: "var(--cal-text-muted, #9CA3AF)",
        inverted: "var(--cal-text-inverted, white)",
        info: "var(--cal-text-info, #253985)",
        success: "var(--cal-text-success, #285231)",
        attention: "var(--cal-text-attention, #73321B)",
        error: "var(--cal-text-error, #752522)",
        brand: "var(--cal-brand-text)",
      },
      screens: {
        pwa: { raw: "(display-mode: standalone)" },
        "3xl": "1920px",
        "4xl": "2560px",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "none" },
        },
        spinning: {
          "100%": { transform: "rotate(360deg)" },
        },
        drawerSlideLeftAndFade: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        drawerSlideRightAndFade: {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 600ms var(--animation-delay, 0ms) cubic-bezier(.21,1.02,.73,1) forwards",
        "fade-in-bottom": "fade-in-bottom cubic-bezier(.21,1.02,.73,1) forwards",
        spinning: "spinning 0.75s linear infinite",
        drawerSlideLeftAndFade: "drawerSlideLeftAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        drawerSlideRightAndFade: "drawerSlideRightAndFade 150ms ease-in",
      },
      borderWidth: {
        "booker-width": "var(--cal-border-booker-width, 1px)",
      },
      fontFamily: {
        cal: ["var(--font-cal)", ...fontFamily.serif],
        sans: ["var(--font-inter)", ...fontFamily.sans],
        mono: ["Roboto Mono", "monospace"],
      },
      maxHeight: (theme) => ({
        0: "0",
        97: "25rem",
        ...theme("spacing"),
        full: "100%",
        screen: "100vh",
      }),
      minHeight: (theme) => ({
        0: "0",
        ...theme("spacing"),
        full: "100%",
        screen: "100vh",
      }),
      minWidth: (theme) => ({
        0: "0",
        ...theme("spacing"),
        full: "100%",
        screen: "100vw",
      }),
      maxWidth: (theme, { breakpoints }) => ({
        0: "0",
        ...theme("spacing"),
        ...breakpoints(theme("screens")),
        full: "100%",
        screen: "100vw",
      }),
      backgroundImage: {
        "gradient-primary": "radial-gradient(162.05% 170% at 109.58% 35%, #667593 0%, #E3E3E3 100%)",
      },
      boxShadow: {
        dropdown: "0px 5px 20px 0px rgba(0, 0, 0, 0.10), 0px 10px 40px 0px rgba(0, 0, 0, 0.03)",
        "switch-thumb": "0px 0.8px 0.8px 0px rgba(0, 0, 0, 0.10), 0px 0.8px 3.2px 0px rgba(0, 0, 0, 0.08)",
        "solid-gray-rested":
          "0px 2px 3px 0px rgba(0, 0, 0, 0.06), 0px 1px 1px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 2px 0.4px 0px rgba(255, 255, 255, 0.16) inset, 0px -1.5px 2px 0px rgba(0, 0, 0, 0.40) inset",
        "solid-gray-hover":
          "0px 2px 3px 0px rgba(0, 0, 0, 0.06), 0px 1px 1px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 2px 0.4px 0px rgba(255, 255, 255, 0.16) inset, 0px -2px 2px 0px rgba(0, 0, 0, 0.40) inset",
        "solid-gray-active":
          "0px 2px 3px 0px rgba(0, 0, 0, 0.40) inset, 0px 0px 2px 1px rgba(0, 0, 0, 0.40) inset",
        "outline-gray-rested": "0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03)",
        "outline-gray-hover": "0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03)",
        "outline-gray-active": "0px 2px 1px 0px rgba(0, 0, 0, 0.05) inset",
        "outline-gray-focused":
          "0px 0px 0px 1px rgba(255, 255, 255, 0.20), 0px 0px 0px 2px rgba(0, 0, 0, 0.10)",
        "outline-red-rested": "0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03)",
        "outline-red-hover": "0px 1px 1px 0px rgba(0, 0, 0, 0.06), 0px 2px 3px 0px rgba(0, 0, 0, 0.08)",
        "outline-red-active":
          "0px 1px 1px 0px rgba(127, 29, 29, 0.06), 0px 0px 3px 0px rgba(127, 29, 29, 0.08), 0px 2px 2px 1px rgba(127, 29, 29, 0.06) inset",
        "elevation-low":
          "0px 1px 1px 0px rgba(0, 0, 0, 0.07), 0px 1px 2px 0px rgba(0, 0, 0, 0.08), 0px 2px 2px 0px rgba(0, 0, 0, 0.10), 0px 0px 8px 0px rgba(0, 0, 0, 0.05)",
        // Brand
        "button-solid-brand-default":
          " 0px 2px 3px 0px rgba(0, 0, 0, 0.06), 0px 1px 1px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 2px 0.4px 0px rgba(255, 255, 255, 0.12) inset, 0px -3px 2px 0px rgba(0, 0, 0, 0.04) inset;",
        "button-solid-brand-hover":
          "0px 1px 1px 0px rgba(0, 0, 0, 0.10), 0px 2px 3px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px -3px 2px 0px rgba(0, 0, 0, 0.10) inset, 0px 2px 0.4px 0px rgba(255, 255, 255, 0.24) inset",
        "button-solid-brand-active":
          "0px 3px 1px 0px rgba(0, 0, 0, 0.10) inset, 0px 0px 2px 0px rgba(0, 0, 0, 0.10) inset",
        "button-solid-brand-focused":
          "0px 0px 0px 1px rgba(255, 255, 255, 0.40), 0px 0px 0px 2px rgba(0, 0, 0, 0.20), 0px 1px 1px 0px rgba(0, 0, 0, 0.10), 0px 2px 3px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px -3px 2px 0px rgba(0, 0, 0, 0.10) inset, 0px 2px 0.4px 0px rgba(255, 255, 255, 0.24) inset",
        // Outline - red
        "button-outline-red-focused":
          "0px 0px 0px 1px rgba(255, 255, 255, 0.32), 0px 0px 0px 2px rgba(220, 38, 38, 0.15)",
      },
    },
  },
  plugins: [
    require("@todesktop/tailwind-variants"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar")({ nocompatible: true }),
    require("tailwindcss-radix")(),
    require("@savvywombat/tailwindcss-grid-areas"),
    plugin(({ addVariant }) => {
      addVariant("mac", ".mac &");
      addVariant("windows", ".windows &");
      addVariant("ios", ".ios &");
    }),
    plugin(({ addBase, theme }) => {
      addBase({
        hr: {
          borderColor: theme("subtle"),
        },
      });
    }),
    plugin(function ({ addVariant }) {
      addVariant("enabled", "&:not(:disabled)");
    }),
  ],
  variants: {
    scrollbar: ["dark"],
  },
};
