import { EMBED_DARK_THEME_CLASS, EMBED_LIGHT_THEME_CLASS } from "./constants";
import type { AllPossibleLayouts, EmbedThemeConfig } from "./types";

export function getMaxHeightForModal() {
  const spacingTopPlusBottom = 2 * 50; // 50 is the padding we want to keep to show close button comfortably. Make it same as top for bottom.
  // It ensures that if the iframe is so tall that it can't fit in the parent window without scroll. Then force the scroll by restricting the max-height to innerHeight
  // This case is reproducible when viewing in ModalBox on Mobile.
  return window.innerHeight - spacingTopPlusBottom;
}

function matchesMediaQuery(query: string) {
  return window.matchMedia(query).matches;
}

export function getTrueLayout({ layout }: { layout: AllPossibleLayouts | null }) {
  const isMobile = matchesMediaQuery("(max-width: 768px)");
  if (isMobile) {
    return "mobile";
  }
  const defaultLayout = "month_view";
  // If layout is mobile and isMobile false, then we need to reset to defaultLayout
  if (layout === "mobile") {
    return defaultLayout;
  }
  return layout ?? defaultLayout;
}

function detectColorScheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getClassBasedOnTheme(theme: EmbedThemeConfig | undefined | null) {
  return theme === "dark" ? EMBED_DARK_THEME_CLASS : EMBED_LIGHT_THEME_CLASS;
}

export function isThemePreferenceProvided(theme: EmbedThemeConfig | undefined | null) {
  return theme === "dark" || theme === "light";
}

export function getThemeClassForEmbed({ theme }: { theme: EmbedThemeConfig | undefined | null }) {
  const systemTheme = detectColorScheme();
  if (isThemePreferenceProvided(theme)) {
    return getClassBasedOnTheme(theme);
  }
  // NOTE: We don't support App configured theme as we can't fetch those details here. User has to explicitly set the theme in the embed snippet or use system theme
  return getClassBasedOnTheme(systemTheme);
}

let colorSchemeDarkQuery: MediaQueryList | null = null;

export function getColorSchemeDarkQuery() {
  if (!colorSchemeDarkQuery) {
    colorSchemeDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  }
  return colorSchemeDarkQuery;
}

export function addDarkColorSchemeChangeListener(listener: (e: MediaQueryListEvent) => void) {
  getColorSchemeDarkQuery().addEventListener("change", listener);
}

export function removeDarkColorSchemeChangeListener(listener: (e: MediaQueryListEvent) => void) {
  getColorSchemeDarkQuery()?.removeEventListener("change", listener);
}
