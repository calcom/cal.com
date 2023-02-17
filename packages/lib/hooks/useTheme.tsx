import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";
import type { Maybe } from "@calcom/trpc/server";

import useMountedState from "./useMountedState";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  let currentTheme: Maybe<string> = theme || "system";

  const { resolvedTheme, setTheme, forcedTheme, theme: activeTheme } = useNextTheme();
  const embedTheme = useEmbedTheme();
  const isMounted = useMountedState();
  // Embed UI configuration takes more precedence over App Configuration
  currentTheme = embedTheme || theme;

  useEffect(() => {
    if (currentTheme !== activeTheme && typeof currentTheme === "string") {
      setTheme(currentTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we do not want activeTheme to re-render this effect
  }, [currentTheme, setTheme]);

  return {
    resolvedTheme,
    setTheme,
    forcedTheme,
    activeTheme,
    isReady: isMounted(),
  };
}
