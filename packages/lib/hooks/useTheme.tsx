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
    // If themeToSet is not provided the app intends to not apply a specific theme
    if (!themeToSet) {
      // But if embedTheme is set then the Embed API intends to apply that theme or it wants "system" theme which is the default
      setTheme(embedTheme || "system");
      return;
    }

    // Embed theme takes precedence over theme configured in app. If embedTheme isn't set that is it's in 'Auto' mode, then it would use the theme configured in appearance.
    const finalThemeToSet = embedTheme || themeToSet;

    if (!finalThemeToSet || finalThemeToSet === activeTheme) return;

    setTheme(finalThemeToSet);
    // We must not add `activeTheme` to the dependency list as it can cause an infinite loop b/w dark and theme switches
    // because there might be another booking page with conflicting theme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeToSet, setTheme, embedTheme]);
  return {
    resolvedTheme,
    setTheme,
    forcedTheme,
    activeTheme,
  };
}
