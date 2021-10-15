import { useEffect, useState } from "react";

import { Maybe } from "@trpc/server";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    setIsReady(true);
    if (!theme) {
      return;
    }
    if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else if (!theme) {
      /** Uncovered case */
    } else {
      document.documentElement.classList.add(theme);
    }
  }, []);

  return {
    isReady,
  };
}
