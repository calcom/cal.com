import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import type { Maybe } from "@calcom/trpc/server";

/**
 * It should be called once per route and only if you want to use app configured theme. System only theme works automatically by using ThemeProvider
 * Calling it without a theme will just returns the current theme.
 * It handles embed configured theme as well.
 */
export default function useTheme(themeToSet?: Maybe<string>) {
  const { resolvedTheme, setTheme, forcedTheme, theme: activeTheme } = useNextTheme();
  const embedTheme = useEmbedTheme();

  useEffect(() => {
    // If themeToSet is not provided the purpose is to just return the current the current values
    if (!themeToSet) return;

    // Embed theme takes precedence over theme configured in app. This allows embeds to be themed differently
    const finalThemeToSet = embedTheme || themeToSet;

    if (!finalThemeToSet || finalThemeToSet === activeTheme) return;

    setTheme(finalThemeToSet);
    // We must not add `activeTheme` to the dependency list as it can cause an infinite loop b/w dark and theme switches
    // because there might be another booking page with conflicting theme.
  }, [themeToSet, setTheme, embedTheme]);
  return {
    resolvedTheme,
    setTheme,
    forcedTheme,
    activeTheme,
  };
}
