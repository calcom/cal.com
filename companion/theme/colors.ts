/**
 * Cal.com Companion App Color Tokens
 *
 * These colors are used for:
 * - React Navigation header styles
 * - SegmentedControl props
 * - SwiftUI modifiers
 * - Ionicons color props
 * - Any place that requires raw color strings
 *
 * For NativeWind/Tailwind usage, use the corresponding class names:
 * - text-cal-text, text-cal-text-secondary, etc.
 * - bg-cal-bg, bg-cal-bg-secondary, etc.
 * - border-cal-border, etc.
 */

export const colors = {
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
} as const;

export type CalColors = typeof colors;
