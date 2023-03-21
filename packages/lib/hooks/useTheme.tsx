import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import type { Maybe } from "@calcom/trpc/server";

/**
 * If themeToSet is provided, it will set the theme to that value. themeToSet is null | "light" | "dark" | "system" | undefined
 * If themeToSet is null, it uses system theme.
 * If themeToSet is undefined or it's not provided it just returns the current theme values
 *
 * It automatically uses the embed theme if configured so.
 */
export default function useTheme(themeToSet?: Maybe<string>) {
  const { resolvedTheme, setTheme, forcedTheme, theme: activeTheme } = useNextTheme();
  const embedTheme = useEmbedTheme();
  console.log("Got Theme", { resolvedTheme, themeToSet, activeTheme, forcedTheme });

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
