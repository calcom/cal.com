/**
 * Centralized color definitions for the Cal.com Companion app.
 *
 * These colors are aligned with the main Cal.com website's design system.
 * Use these constants for inline styles. For Tailwind classes, use the
 * corresponding cal-* color classes defined in tailwind.config.js.
 *
 * Color Philosophy:
 * - Light mode: Clean whites and light grays
 * - Dark mode: Pure black (#000000) for OLED efficiency, with neutral grays
 *   from the main website (#171717, #262626, #404040) for secondary elements
 */

export const colors = {
  light: {
    // Backgrounds
    background: "#FFFFFF",
    backgroundSecondary: "#F8F9FA",
    backgroundMuted: "#F2F2F7",
    backgroundEmphasis: "#E5E5EA",

    // Text
    text: "#333333",
    textSecondary: "#666666",
    textMuted: "#A3A3A3",
    textEmphasis: "#3C3F44",

    // Borders
    border: "#E5E5EA",
    borderLight: "#C6C6C8",
    borderSubtle: "#D1D5DB",

    // Accent colors
    accent: "#007AFF",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    destructive: "#800020",
  },

  dark: {
    // Backgrounds - Pure black for main, website grays for secondary
    background: "#000000",
    backgroundSecondary: "#171717",
    backgroundMuted: "#262626",
    backgroundEmphasis: "#404040",

    // Text - White primary, website gray for secondary
    text: "#FFFFFF",
    textSecondary: "#A3A3A3",
    textMuted: "#A3A3A3",

    // Borders - Website grays
    border: "#4D4D4D",
    borderLight: "#4D4D4D",
    borderSubtle: "#262626",

    // Accent colors
    accent: "#007AFF",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    destructive: "#FF453A",
  },
} as const;

/**
 * Helper function to get colors based on dark mode state.
 * @param isDark - Whether dark mode is enabled
 * @returns The appropriate color palette
 */
export function getColors(isDark: boolean) {
  return isDark ? colors.dark : colors.light;
}

/**
 * Semantic color mappings for common UI elements.
 * These provide consistent styling across the app.
 */
export const semanticColors = {
  // Card backgrounds
  card: {
    light: colors.light.background,
    dark: colors.dark.backgroundSecondary,
  },

  // Input field backgrounds
  input: {
    light: colors.light.background,
    dark: colors.dark.backgroundSecondary,
  },

  // Modal/sheet backgrounds
  modal: {
    light: colors.light.background,
    dark: colors.dark.background,
  },

  // List item backgrounds
  listItem: {
    light: colors.light.background,
    dark: colors.dark.backgroundSecondary,
  },

  // Transparent background mode (glass UI effect)
  transparentBg: {
    light: "rgba(255, 255, 255, 0.6)",
    dark: "rgba(23, 23, 23, 0.8)",
  },

  transparentBorder: {
    light: "rgba(209, 213, 219, 0.4)",
    dark: "rgba(77, 77, 77, 0.4)",
  },

  // Skeleton loading state
  skeleton: {
    light: colors.light.backgroundEmphasis,
    dark: colors.dark.backgroundEmphasis,
  },
} as const;
