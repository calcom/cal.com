import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import type { Maybe } from "@calcom/trpc/server";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  theme = theme || "system";
  const { resolvedTheme, setTheme, forcedTheme } = useNextTheme();
  const [isReady, setIsReady] = useState<boolean>(false);
  const embedTheme = useEmbedTheme();
  // Embed UI configuration takes more precedence over App Configuration
  theme = embedTheme || theme;

  useEffect(() => {
    if (theme) {
      setTheme(theme);
    }
    setIsReady(true);
  }, [theme, setTheme]);

  return {
    resolvedTheme,
    setTheme,
    isReady,
    forcedTheme,
  };
}
