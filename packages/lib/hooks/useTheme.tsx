import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import type { Maybe } from "@calcom/trpc/server";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  const { resolvedTheme, setTheme, forcedTheme, theme: activeTheme } = useNextTheme();
  const embedTheme = useEmbedTheme();
  // Embed UI configuration takes more precedence over App Configuration
  const currentTheme = embedTheme || theme || "system";

  useEffect(() => {
    if (currentTheme !== activeTheme && typeof currentTheme === "string") {
      setTheme(currentTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we do not want activeTheme to re-render this effect
  }, [currentTheme, setTheme]);

  useEffect(() => {
    if (forcedTheme) setTheme(forcedTheme);
  }, [forcedTheme, setTheme]);

  return {
    resolvedTheme,
    setTheme,
    forcedTheme,
    activeTheme,
  };
}
