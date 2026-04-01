"use client";

import { useEffect } from "react";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";

type CssVariables = Record<string, string>;

const COSS_SYNCED_VARIABLES = ["primary", "ring", "primary-foreground"] as const;
const DEFAULT_BRAND_COLORS = new Set([
  DEFAULT_LIGHT_BRAND_COLOR.toLowerCase(),
  DEFAULT_DARK_BRAND_COLOR.toLowerCase(),
]);

const clearThemeVariables = (style: CSSStyleDeclaration) => {
  COSS_SYNCED_VARIABLES.forEach((key) => style.removeProperty(`--${key}`));
};

const applyThemeVariables = (style: CSSStyleDeclaration, entries: [string, string][]) => {
  // Avoid stale values from previous renders/theme transitions.
  clearThemeVariables(style);

  const shouldSyncCossPrimary = entries.some(([key, value]) => {
    if (key !== "cal-brand") return false;
    return !DEFAULT_BRAND_COLORS.has(value.toLowerCase());
  });

  entries.forEach(([key, value]) => {
    style.setProperty(`--${key}`, value);

    // Keep COSS primary tokens in sync with Cal brand tokens.
    if (shouldSyncCossPrimary && key === "cal-brand") {
      style.setProperty("--primary", value);
      style.setProperty("--ring", `color-mix(in srgb, ${value} 80%, transparent)`);
    }

    if (shouldSyncCossPrimary && key === "cal-brand-text") {
      style.setProperty("--primary-foreground", value);
    }
  });
};

// Sets up CSS Variables based on brand colours
const useCalcomTheme = (theme: Record<string, CssVariables>) => {
  useEffect(() => {
    Object.entries(theme).forEach(([key, value]) => {
      if (!value) {
        // should not be reached
        return;
      }
      if (key === "root") {
        const root = document.documentElement;
        if (!Object.keys(value).length) {
          clearThemeVariables(root.style);
          return;
        }
        applyThemeVariables(root.style, Object.entries(value));
        return;
      }

      const elements = document.querySelectorAll(`.${key}`);
      const nestedEntries = Object.entries(value);
      elements.forEach((element) => {
        if (!nestedEntries.length) {
          clearThemeVariables((element as HTMLElement).style);
          return;
        }
        applyThemeVariables((element as HTMLElement).style, nestedEntries);
      });
    });
  }, [theme]);
};

export { useCalcomTheme };
