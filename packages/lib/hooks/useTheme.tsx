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
    if (themeToSet === undefined) return;

    // Embed theme takes precedence over theme configured in app. This allows embeds to be themed differently
    const finalThemeToSet = embedTheme || themeToSet || "system";

    if (!finalThemeToSet || finalThemeToSet === activeTheme) return;

    console.log("Setting theme", { resolvedTheme, finalThemeToSet, activeTheme, forcedTheme });
    setTheme(finalThemeToSet);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we do not want activeTheme to re-render this effect
  }, [themeToSet, setTheme]);

  return {
    resolvedTheme,
    setTheme,
    forcedTheme,
    activeTheme,
  };
}
