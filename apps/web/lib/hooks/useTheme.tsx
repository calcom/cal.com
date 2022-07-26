import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import { Maybe } from "@calcom/trpc/server";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  theme = theme || "system";
  const { theme: currentTheme, setTheme } = useNextTheme();
  const embedTheme = useEmbedTheme();
  // Embed UI configuration takes more precedence over App Configuration
  theme = embedTheme || theme;

  useEffect(() => {
    if (theme) {
      setTheme(theme);
    }
  }, [theme, setTheme]);

  return {
    currentTheme,
    setTheme,
  };
}
