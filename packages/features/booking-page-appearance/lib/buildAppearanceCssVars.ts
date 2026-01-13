import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";

export type CssVarsPerTheme = {
  light?: Record<string, string>;
  dark?: Record<string, string>;
};

/**
 * Maps BookingPageAppearance settings to CSS custom properties.
 * These CSS variables can be injected into the booking page to apply custom styling.
 */
export function buildAppearanceCssVars(appearance: BookingPageAppearance | null): CssVarsPerTheme | undefined {
  if (!appearance) return undefined;

  const lightVars: Record<string, string> = {};
  const darkVars: Record<string, string> = {};

  // Typography
  if (appearance.fontFamily) {
    lightVars["cal-font-family"] = appearance.fontFamily;
    darkVars["cal-font-family"] = appearance.fontFamily;
  }

  if (appearance.headingFontFamily) {
    lightVars["cal-heading-font-family"] = appearance.headingFontFamily;
    darkVars["cal-heading-font-family"] = appearance.headingFontFamily;
  }

  if (appearance.fontSize) {
    if (appearance.fontSize.base) {
      lightVars["cal-font-size-base"] = appearance.fontSize.base;
      darkVars["cal-font-size-base"] = appearance.fontSize.base;
    }
    if (appearance.fontSize.heading) {
      lightVars["cal-font-size-heading"] = appearance.fontSize.heading;
      darkVars["cal-font-size-heading"] = appearance.fontSize.heading;
    }
    if (appearance.fontSize.small) {
      lightVars["cal-font-size-small"] = appearance.fontSize.small;
      darkVars["cal-font-size-small"] = appearance.fontSize.small;
    }
  }

  // Border Radius
  if (appearance.borderRadius) {
    if (appearance.borderRadius.base) {
      lightVars["cal-border-radius"] = appearance.borderRadius.base;
      darkVars["cal-border-radius"] = appearance.borderRadius.base;
    }
    if (appearance.borderRadius.button) {
      lightVars["cal-border-radius-button"] = appearance.borderRadius.button;
      darkVars["cal-border-radius-button"] = appearance.borderRadius.button;
    }
    if (appearance.borderRadius.card) {
      lightVars["cal-border-radius-card"] = appearance.borderRadius.card;
      darkVars["cal-border-radius-card"] = appearance.borderRadius.card;
    }
    if (appearance.borderRadius.input) {
      lightVars["cal-border-radius-input"] = appearance.borderRadius.input;
      darkVars["cal-border-radius-input"] = appearance.borderRadius.input;
    }
  }

  // Colors - Light theme
  if (appearance.colors) {
    if (appearance.colors.background) {
      lightVars["cal-bg"] = appearance.colors.background;
    }
    if (appearance.colors.backgroundMuted) {
      lightVars["cal-bg-muted"] = appearance.colors.backgroundMuted;
    }
    if (appearance.colors.textPrimary) {
      lightVars["cal-text"] = appearance.colors.textPrimary;
    }
    if (appearance.colors.textSecondary) {
      lightVars["cal-text-secondary"] = appearance.colors.textSecondary;
    }
    if (appearance.colors.textMuted) {
      lightVars["cal-text-muted"] = appearance.colors.textMuted;
    }
    if (appearance.colors.buttonText) {
      lightVars["cal-button-text"] = appearance.colors.buttonText;
    }
    if (appearance.colors.calendarSelectedDay) {
      lightVars["cal-calendar-selected"] = appearance.colors.calendarSelectedDay;
    }
    if (appearance.colors.calendarAvailableDay) {
      lightVars["cal-calendar-available"] = appearance.colors.calendarAvailableDay;
    }
    if (appearance.colors.timeslotBackground) {
      lightVars["cal-timeslot-bg"] = appearance.colors.timeslotBackground;
    }
    if (appearance.colors.timeslotHover) {
      lightVars["cal-timeslot-hover"] = appearance.colors.timeslotHover;
    }
    if (appearance.colors.borderDefault) {
      lightVars["cal-border"] = appearance.colors.borderDefault;
    }
    if (appearance.colors.borderSubtle) {
      lightVars["cal-border-subtle"] = appearance.colors.borderSubtle;
    }
  }

  // Spacing
  if (appearance.spacing) {
    if (appearance.spacing.containerPadding) {
      lightVars["cal-container-padding"] = appearance.spacing.containerPadding;
      darkVars["cal-container-padding"] = appearance.spacing.containerPadding;
    }
    if (appearance.spacing.componentGap) {
      lightVars["cal-component-gap"] = appearance.spacing.componentGap;
      darkVars["cal-component-gap"] = appearance.spacing.componentGap;
    }
  }

  // Shadows
  if (appearance.shadows) {
    if (appearance.shadows.card) {
      lightVars["cal-shadow-card"] = appearance.shadows.card;
      darkVars["cal-shadow-card"] = appearance.shadows.card;
    }
    if (appearance.shadows.button) {
      lightVars["cal-shadow-button"] = appearance.shadows.button;
      darkVars["cal-shadow-button"] = appearance.shadows.button;
    }
  }

  // Only return if we have any values
  const hasLightVars = Object.keys(lightVars).length > 0;
  const hasDarkVars = Object.keys(darkVars).length > 0;

  if (!hasLightVars && !hasDarkVars) return undefined;

  const result: CssVarsPerTheme = {};
  if (hasLightVars) result.light = lightVars;
  if (hasDarkVars) result.dark = darkVars;

  return result;
}

/**
 * Converts CSS variables object to a CSS string that can be injected into a style tag.
 */
export function cssVarsToStyleString(cssVars: CssVarsPerTheme | undefined): string {
  if (!cssVars) return "";

  let styleString = "";

  if (cssVars.light && Object.keys(cssVars.light).length > 0) {
    const lightVarsString = Object.entries(cssVars.light)
      .map(([key, value]) => `--${key}: ${value};`)
      .join("\n  ");
    styleString += `:root, [data-theme="light"] {\n  ${lightVarsString}\n}\n`;
  }

  if (cssVars.dark && Object.keys(cssVars.dark).length > 0) {
    const darkVarsString = Object.entries(cssVars.dark)
      .map(([key, value]) => `--${key}: ${value};`)
      .join("\n  ");
    styleString += `[data-theme="dark"] {\n  ${darkVarsString}\n}\n`;
  }

  return styleString;
}

/**
 * Generates a Google Fonts link tag URL for the specified font families.
 */
export function buildGoogleFontsUrl(appearance: BookingPageAppearance | null): string | null {
  if (!appearance) return null;

  const fonts: string[] = [];

  if (appearance.fontFamily && isGoogleFont(appearance.fontFamily)) {
    fonts.push(appearance.fontFamily);
  }

  if (appearance.headingFontFamily && isGoogleFont(appearance.headingFontFamily)) {
    fonts.push(appearance.headingFontFamily);
  }

  if (fonts.length === 0) return null;

  // Remove duplicates
  const uniqueFonts = [...new Set(fonts)];

  // Build Google Fonts URL
  const fontParams = uniqueFonts
    .map((font) => `family=${encodeURIComponent(font)}:wght@400;500;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
}

/**
 * List of popular Google Fonts that we support.
 * This list can be extended as needed.
 */
export const SUPPORTED_GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Nunito",
  "Raleway",
  "Ubuntu",
  "Playfair Display",
  "Merriweather",
  "PT Sans",
  "Noto Sans",
  "Work Sans",
  "DM Sans",
  "Outfit",
  "Plus Jakarta Sans",
  "Manrope",
  "Space Grotesk",
] as const;

export type SupportedGoogleFont = (typeof SUPPORTED_GOOGLE_FONTS)[number];

/**
 * Checks if a font family is a supported Google Font.
 */
export function isGoogleFont(fontFamily: string): fontFamily is SupportedGoogleFont {
  return SUPPORTED_GOOGLE_FONTS.includes(fontFamily as SupportedGoogleFont);
}
