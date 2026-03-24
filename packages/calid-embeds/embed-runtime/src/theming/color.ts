const DARK = "cal-element-embed-dark";
const LIGHT = "cal-element-embed-light";

export const ThemeClasses = { DARK, LIGHT } as const;

export type ThemeToken = "dark" | "light" | "auto";
export type LayoutToken = "month_view" | "week_view" | "column_view" | "mobile";

export function getSystemScheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function isExplicitTheme(t: ThemeToken | null | undefined): boolean {
  return t === "dark" || t === "light";
}

export function toThemeClass(t: ThemeToken | null | undefined): string {
  const dark = isExplicitTheme(t) ? t === "dark" : getSystemScheme() === "dark";
  return dark ? DARK : LIGHT;
}

let cachedDarkQuery: MediaQueryList | null = null;

export function darkSchemeQuery(): MediaQueryList {
  cachedDarkQuery ??= window.matchMedia("(prefers-color-scheme: dark)");
  return cachedDarkQuery;
}

export function addDarkSchemeListener(fn: (e: MediaQueryListEvent) => void): void {
  darkSchemeQuery().addEventListener("change", fn);
}

export function removeDarkSchemeListener(fn: (e: MediaQueryListEvent) => void): void {
  darkSchemeQuery()?.removeEventListener("change", fn);
}

export function modalMaxHeight(): number {
  return window.innerHeight - 100;
}

export function effectiveLayout(requested: LayoutToken | null): LayoutToken {
  if (window.matchMedia("(max-width: 768px)").matches) return "mobile";
  if (requested === "mobile") return "month_view";
  return requested ?? "month_view";
}
